import { AppEvents, PORTAL_TYPE, ReactRNPlugin, Rem, RichTextInterface, RNPlugin } from '@remnote/plugin-sdk';
import { ACT_OPTIONS_LOGGER_PW_CODE, GTD_ACTIVE_PW, GTD_LOGGER_PW_CODE, OwnerState, TIME_TK_PW_CODE } from './consts';
import { Utils } from './utils';
import _ from 'lodash';


/**
 * a class to wrap a rem as an GTD Item
 */
export class GTDItem{
    readonly rem: Rem;
    private plugin: ReactRNPlugin;
    private utils: Utils;
    constructor(r:Rem,plugin:ReactRNPlugin,util:Utils) {
        this.rem=r;
        this.plugin=plugin;
        this.utils=util;
    }

    /**
     * check whether a rem is tagged by the host
     * @param hostId the id of the specific host
     */
    public async isTaggedWithHost(hostId:string){
        const tags=await this.rem.getTagRems()
        for(const typeParent of tags)
        {
            if(hostId===typeParent._id)
                return true
        }
        return false
    }

    /**
     * literally. `undefined` will be returned if portal is failed to create
     * @param uniqUnder if set, duplicate portal within the children of `uniqUnder` will be removed
     */
    public async createPortalForItem(uniqUnder:undefined|Rem=undefined){

        if(uniqUnder)
        {
            for(const por of await this.rem.portalsAndDocumentsIn())
            {
                if(por._id!==this.rem._id&&por.parent===uniqUnder._id&&await por.getPortalType()===PORTAL_TYPE.PORTAL)
                    return por;
            }
        }

        const portal=await this.plugin.rem.createPortal();
        if(!portal)return;
        await this.rem.addToPortal(portal);
        if(uniqUnder)await portal.setParent(uniqUnder)
        return portal;
    }

    /**
     * Enable a GTD item to muzzle its GTD handlers when its property `disabled` is toggled,
     * by removing the `active item` power up when `disabled` is toggled or removed.
     *
     * Can be understood as an implementation of "soft deletion".
     */
    public async activateEnablerListener()
    {
        const handler=async ()=>{
            if(!await this.isTaggedWithHost(this.utils.gtdHost._id))
            {
                this.plugin.event.removeListener(AppEvents.RemChanged,this.rem._id,handler);
                return;
            }
            const enablerCondStr= await this.getEnabledCondStr();
            if("Yes"===enablerCondStr)
            {
                await this.rem.removePowerup(GTD_ACTIVE_PW.PW);
            }
            else if("No"===enablerCondStr)
            {
                await this.rem.addPowerup(GTD_ACTIVE_PW.PW);
            }

        }
        this.plugin.event.addListener(AppEvents.RemChanged,this.rem._id,handler)
    }

    public async getEnabledCondStr(){
        let enablerCondRichText = await this.rem.getTagPropertyValue(this.utils.disablerHost._id);
        return await this.plugin.richText.toString(enablerCondRichText);
    }

    public async setIsEnabled(isEnabled:boolean){
        let enablerCondStr=isEnabled ? "Yes":"No";
        let enablerCondRichText=await this.plugin.richText.text(enablerCondStr).value();
        await this.rem.setTagPropertyValue(this.utils.disablerHost._id,enablerCondRichText);
    }


    public async createReferenceUnder(refParent?:Rem){
        if(refParent)
        {
            for(const refR of await this.rem.remsReferencingThis())
            {
                if(refR.parent===refParent._id)
                    return refR
            }
        }

        const refContent=await this.plugin.richText.rem(this.rem).value()
        const ref=await this.utils.createRemWithText(refContent)
        if(refParent)await ref.setParent(refParent)
        return ref
    }



    /**
     * get the property specified by "propertyId" of "this.rem" and return it as Rem
     * @param propertyId
     * @return
     *
     * when the property to return does not contain a reference, the param "type" will be ignored and the plain text itself will be returned.
     *
     * when `type==="Rem"` and the property to return contains a reference, but the Rem cannot be found (e.g. Privacy Rem or Deleted Rem), the function will return this id despite the "type" parameter
     */
    public async getPropertyOfRemAsRems(propertyId:string) {
        let propertyRichText=await this.rem.getTagPropertyValue(propertyId)
        let results:string[];
        results=_.uniq<string>(await this.plugin.richText.getRemIdsFromRichText(propertyRichText))
        const resultRems=await this.plugin.rem.findMany(results)
        if(resultRems?.length)
            return resultRems
    }


    //region Functions to process time-related things, like stamps and ticks



    /**
     * get the  RemIds  "THE_DATE" property of a GTD item refers to.
     *
     * In ideal condition the RemIds this function returns should be the id of a Daily Document(please check this if necessary)
     */
    public async getDateRemIdWithProperty() {

        return await this.getPropertyOfRemAsRems(this.utils.dateHost._id) as Rem[]


    }
    /**
     * link gtd item "r" to the daily doc and time stamp the property "this.rem.THE_DATE" and "this.rem.TIME_TICK" specify.
     * @return the actual anchor link in daily doc as timestamp if "this.rem.THE_DATE" exists.
     * @param link the anchor link in the Daily doc pointing at "r". (optional input, will be a new portal containing "r" if left void in the arguments)
     */
    public async linkGTDItemToDairy(link?:Rem){
        const dateRems=await this.getDateRemIdWithProperty();
        if(!dateRems)return;

        if(dateRems.length)
        {
            const dateRem=dateRems[0]
            //get the "time tick" property
            let tick=await this.rem.getTagPropertyValue(this.utils.tickHost._id);
            //get the "time tick" rem
            let tickRemL=await this.plugin.richText.getRemIdsFromRichText(tick);


            //the var "stamp" has 3 types
            //1. if the GTD item "r" has no property "TimeTick", "stamp" will be the daily doc
            //2. if the "TimeTick" property of "r" is plain text, a new stamp tagged with "Time Tick" powerUp will be created, whose content will be the plain text
            //3. if the "TimeTick" property of "r" is a reference to another rem, "stamp" will be that rem.
            let stamp= await this.plugin.richText.length(tick) ?
                (tickRemL.length===0 ? await this.utils.setupStampWithRichText(dateRem,tick): await this.plugin.rem.findByName(await this.plugin.richText.text(tickRemL[0]).value(),dateRem._id))
                : dateRem;

            if(stamp?._id!==dateRem._id)await stamp?.setParent(dateRem)

            // copy the Priority (timeline type) from the item's property to the time tick's one.
            if(stamp)
            {
                link=link || await this.utils.createPortalForItem(this.rem,stamp);
                await link?.setParent(stamp);


                // Time ticks add in the previous step need to be tagged with PW "TimeTick" and assign the property "TickType"
                //DONE: Change the property name "DDL" under "GTD Items" to "the DATE" and Add a property "DATE Type" with "Deadline/Warning/Informing/LogTick" to select

                const timeLineTypePropVal=await this.rem.getTagPropertyValue(this.utils.timeLineTypeHost._id);

                const timeLineTypePropRem=await this.rem.getTagPropertyAsRem(this.utils.timeLineTypeHost._id);
                const timeLTypeOpts= timeLineTypePropRem && ((await timeLineTypePropRem.remsBeingReferenced()))?.filter(r=>r._id!==this.utils.timeLineTypeHost._id)
                console.assert(!!timeLTypeOpts)
                if(!(timeLTypeOpts&&timeLTypeOpts.length))return
                const optVal=(await timeLTypeOpts[0].getTagRems())[0];
                if(await stamp.hasPowerup(TIME_TK_PW_CODE.TICK_PW)&&timeLineTypePropVal.length)
                {
                    const slotRem=await this.plugin.powerup.getPowerupSlotByCode(TIME_TK_PW_CODE.TICK_PW,TIME_TK_PW_CODE.TICK_SLOT);
                    if(!slotRem)await this.plugin.app.toast("Where is the slot : "+ TIME_TK_PW_CODE.TICK_SLOT)
                    else
                    {
                        for( const optEnum of await slotRem?.getChildrenRem())
                        {
                            if(optEnum.text&&optVal.text&&await this.plugin.richText.equals(optEnum.text,optVal.text)&&await optEnum.isPowerupEnum())
                            {
                                const ref2OptEnum=await this.plugin.richText.rem(optEnum).value();
                                await stamp.setPowerupProperty(TIME_TK_PW_CODE.TICK_PW,TIME_TK_PW_CODE.TICK_SLOT,ref2OptEnum);
                            }
                        }
                    }
                }
            }
            return stamp

        }
    }
    //endregion


    //region Functions and variables to handle the "Owner Project" property



    /**
     * The **supplement of**  "getCollected" logic for rem with "Owner Project" property ( and mainly for rem with "treat as project" action)
     *
     * If the value of `owner_item` property
     *
     *  - is blank, function will return with `OwnerState.INVALID_4_SRC_NOT_EXIST`
     *
     *  - is text without references to rems, a new owner rem will be created with this text and `r` will be collected under that. Then `OwnerState.NOT_EXIST` will be returned
     *
     *  - contains only one reference to rem, the referenced rem will be the owner of `r` and get collected by that owner. Then `OwnerState.UNIQUE` will be returned
     *
     *  - contains  multiple references to rems, references to `r` will be created under all the referenced "owner" rem with `OwnerState.NOT_UNIQUE` returned.
     *
     * @param r the rem to collect/contain
     * @param actionCode the action PW code specifying the corresponding container "r" could go to besides the `Owner rem`
     * @return state code describing the value of `this.rem.OWNER_ITEM(s)`
     */
    public async getCollectedWithOwner(actionCode:string=ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Project,){


        //the rems of "this.rem.OwnerProject" if this property exists.
        const ownerPropertyAsRems=await this.getPropertyOfRemAsRems(this.utils.ownerPrjHost._id)
        //if the property value is text without rem references.
        if(!ownerPropertyAsRems||ownerPropertyAsRems.length===0)
        {
            //done : how about create a project with this property value?
            //Q: need to know whether "taggedRems" include indirect tagged Rems?
            //A: no problem, for there are specific API named "ancestorTagRems" and "descendantTagRems"
            //Q: has other rems used the "tag channel"?
            //A: "not yet" can be asserted after checking the code.

            const newItem= await this.utils.createContainedITEMWithRichText(await this.rem.getTagPropertyValue(this.utils.ownerPrjHost._id))
            if(!newItem)
            {
                return OwnerState.INVALID_4_SRC_NOT_EXIST
            }
            await this.rem.setTagPropertyValue(this.utils.ownerPrjHost._id,await this.plugin.richText.rem(newItem).value())
            await this.rem.setParent(newItem._id)
            return OwnerState.NOT_EXIST
        }
        //if there are references in the value of property
        else
        {
            //when owner Project is unique
            if(ownerPropertyAsRems.length===1)
            {
                const owner=ownerPropertyAsRems[0]
                await this.rem.setParent(owner)
                await this.utils.createReferenceFor(this.rem,await this.utils.getCollected(undefined,actionCode))
                return OwnerState.UNIQUE
            }
            //when this item belongs to multiple project.
            else if(ownerPropertyAsRems.length>1){
                for(const owner of ownerPropertyAsRems)
                {
                    await this.utils.createReferenceFor(this.rem,owner)
                }

                return OwnerState.NOT_UNIQUE
            }
        }


    }

    /**
     * the "getCollect" logic for item rem with `Owner` property, supplement logic for these rems has been integrated into this function.
     *
     * when `OwnerState.INVALID_4_SRC_NOT_EXIST` or `OwnerState.NOT_UNIQUE` was returned by `getCollectedWithOwner` in this function,
     * `this.rem` will be collected into the container `actionCode` specified.
     *
     * @param actionCode  which container does "r" go?
     */
    public async getContainedWithOwner(actionCode:string=ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Project){
        const state=await this.getCollectedWithOwner(actionCode)
        if(state===OwnerState.INVALID_4_SRC_NOT_EXIST||state===OwnerState.NOT_UNIQUE)
        {
            (await this.utils.getCollected(this.rem, actionCode, OwnerState.INVALID_4_SRC_NOT_EXIST===state&&this.rem.parent!==this.utils.gtdHost._id))
        }
    }

    //endregion


    /**
     * the logic to process rems with "this.rem.Scenario" property. it will
     * 1. get scenario contained and cached in the `SCENARIO` property under the `HOST` tableview.
     * @return a boolean value indicating where the rem "r" has property "r.Scenario"
     */
    public async getContainedWithScenario(){
        //DONE: Scenario may contains peoples to delegate...

        //region get scenario contained and cached in the host tableview.

        //get the rems of "r.Scenario" if this property exists.
        const scenarioAsRem=await this.getPropertyOfRemAsRems(this.utils.sceneHost._id)
        //if the property value is text without rem references.
        if(!scenarioAsRem||scenarioAsRem.length === 0)
        {
            //add this scenario to be a potential option of `SCENARIO` property
            const newScenario=await this.utils.createContainedITEMWithRichText(await this.rem.getTagPropertyValue(this.utils.sceneHost._id),ACT_OPTIONS_LOGGER_PW_CODE.ASPECT_CONTAINERS.SCENARIO)
            if(!newScenario)
            {
                // await getCollected(r,actionCode);
                return false;
            }
            await newScenario?.addTag(this.utils.sceneHost)
            await this.rem.setTagPropertyValue(this.utils.sceneHost._id,await this.plugin.richText.rem(newScenario).value())
        }
        else
            //if there are references in the value of property
            // the referenced rem will become one  Scenario Option
        {
            for(const scene of scenarioAsRem)
            {
                await scene.setParent(this.utils.sceneHost._id)
                await scene.addTag(this.utils.sceneHost)
            }

        }
        //endregion
        return true

    }




}