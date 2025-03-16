import {
    AppEvents,
    BuiltInPowerupCodes,
    PropertyLocation,
    PropertyType,
    ReactRNPlugin,
    Rem,
    SelectSourceType,
} from '@remnote/plugin-sdk';
import {
    ACT_OPTIONS_LOGGER_PW_CODE, GTD_ACTIVE_PW,
    GTD_HOST_PW,
    GTD_LOGGER_PW_CODE,
    HostCheckResult,
    HostType,
    PW2SLOTS,
    TIME_TK_PW_CODE,
} from './consts';
import { getUtils } from './utils';
import { GTDItem } from './GTDItem';
// @ts-ignore
import { clearInterval } from 'timer';

// export let utils:{[key:string]:(...args: any[])=> any }

//region utility Functions to process Typescript Objects
const allKeyObj=(obj:{[key:string]:string})=>{
    return Object.keys(obj).reduce((acc,key)=>{
        // @ts-ignore
        acc[key]=key;
        return acc;
    },{} as {[key:string]:string})
}

const reverseObj=(obj:{[key:string]:string})=>{
    return Object.keys(obj).reduce((acc,key)=>{
        // @ts-ignore
        acc[obj[key]]=key;
        return acc;
    },{} as {[key:string]:string})
}
//endregion


let  gtdListenerQueue=new Promise<void>((resolve, reject)=>{resolve()})




export const init_PowerUps =async (plugin:ReactRNPlugin) => {


    //region Init PowerUps

    //region Init the TimeTick PW
    await plugin.app.registerPowerup('Time Tick', TIME_TK_PW_CODE.TICK_PW, 'The powerUp to tag the time ticks, mainly used in DailyDocs', {
        slots: [{
            code: TIME_TK_PW_CODE.TICK_SLOT,
            name: 'TickType',
            onlyProgrammaticModifying: true,
            hidden: false,
            propertyLocation:PropertyLocation.BELOW,
            enumValues:TIME_TK_PW_CODE.TICK_TYPE,
            defaultEnumValue:TIME_TK_PW_CODE.TICK_TYPE.LOG
        }]
    });
    //endregion

    // const gtd_logger_slot_list=Object.entries(GTD_LOGGER_PW_CODE.LOGGER_SLOTS)
    //region Init the GTD Logger PW
    let gtdSlots: any[][] = [
        //USAGE: "THE_DATE" cannot be multiselect, or another GTD item needed to be created
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE, 'THE_DATE',PropertyLocation.BELOW, PropertyType.DATE,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK, 'TIME_TICK',PropertyLocation.ONLY_DOCUMENT, PropertyType.MULTI_SELECT,SelectSourceType.Relation,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.SCENARIO, 'SCENARIO',PropertyLocation.BELOW , PropertyType.TEXT,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIMELINE_TYPE, 'TIMELINE_TYPE',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.Enum,TIME_TK_PW_CODE.TICK_TYPE],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.OWNER_ITEM, 'OWNER_ITEM',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.AnyRem,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS, 'TREAT_AS',PropertyLocation.RIGHT, PropertyType.SINGLE_SELECT, SelectSourceType.Enum,allKeyObj(ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS)],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.MESSAGE, 'MESSAGE',PropertyLocation.ONLY_DOCUMENT, PropertyType.TEXT,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.DISABLED,"Disabled",PropertyLocation.RIGHT,PropertyType.CHECKBOX,undefined,undefined]
    ];
    await plugin.app.registerPowerup('GTD Engine', GTD_LOGGER_PW_CODE.LOGGER_PW,
        "A PowerUp marking up the properties under the host of the PowerUp tag 'GTD Engine Host' ", {
            slots: gtdSlots.map(slot => {
                return  {
                    code: slot[0],
                    name: slot[1],
                    hidden: true,
                    onlyProgrammaticModifying: true,
                    propertyType: slot[3],
                    propertyLocation:slot[2],
                    selectSourceType:slot[4],
                    enumValues:slot[5] // Record<string as Aila,string as Rem Content>
                }
            }),
        });
    //endregion

    await plugin.app.registerPowerup("Active Item",GTD_ACTIVE_PW.PW,"A power up to tag the active GTD items which has not been disabled yet.",{
        slots:[]
    })

    //region Init the Action Type Logger PW and Container PW
    const act_logger_slotCode_list=Object.entries(ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS)

    await plugin.app.registerPowerup("GTD Act Containers",ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,
        "A PowerUp marking up the receiver Rems of 'Treat As', containing Rems marshalled by decisions made with GTD",
        {
            slots:act_logger_slotCode_list.map((r)=>{
                return{
                    code:"c"+r[1],
                    name:r[0],
                    hidden:false,
                    onlyProgrammaticModifying:true,
                }
            })
        })
    //endregion

    //region Init host attaching PW
    await plugin.app.registerPowerup("GTD Engine Host",GTD_HOST_PW,
        "the PowerUp to tag the unique host rem to fulfill the functionalities of this plugin",
        {
            slots:[]
        })

    //endregion

    //region Init interface panel PW in sidebar
    // a rem to show all the container rems of GTD engine
    await plugin.app.registerPowerup("GTD Containers Panel",ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE,
        "a rem to show all the container rems of GTD engine" ,{slots:Object.entries(ACT_OPTIONS_LOGGER_PW_CODE.ASPECT_CONTAINERS).map((r)=>{
                /*const aspect=r[0] as keyof aspect_containers*/
                return {
                    code:r[1],
                    name:r[0],
                    hidden: true,
                    onlyProgrammaticModifying: true,

                    /* propertyLocation:ACT_OPTIONS_LOGGER_PW_CODE.ASPECT_OPTIONS[aspect][0],
                     propertyType:ACT_OPTIONS_LOGGER_PW_CODE.ASPECT_OPTIONS[aspect][1],
                     selectSourceType:ACT_OPTIONS_LOGGER_PW_CODE.ASPECT_OPTIONS[aspect][2],
                     enumValues:ACT_OPTIONS_LOGGER_PW_CODE.ASPECT_OPTIONS[aspect][3] */

                    //Done: these are also "template slots" for host rems?maybe not... slot themselves are hidden but not the property of host...
                }   // action is that making multiple Containers?
                    // I have to suspend this (or maybe forgave this thought) ---- maybe classify that manually  by  users will be fine.
            })})
    //endregion

    //endregion

    const sidebar = await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DocumentSidebar);
    if(!sidebar) return
    /**
     * add a rem to sidebar, within a portal or move it to sidebar directly
     * @param r the rem added to sidebar within a portal
     * @param portalLikeLink portal or other rems that is directly in the sidebar
     * @param linkIsPortal assign whether "portalLikeLink" is a portal explicitly
     */
    const addToSidebar=async (r:Rem,portalLikeLink?:Rem|undefined,linkIsPortal?:boolean)=>{

        let tag= (!portalLikeLink)||!!linkIsPortal
        portalLikeLink= portalLikeLink || await plugin.rem.createPortal()
        if(sidebar&&portalLikeLink)
        {
            if(tag)
            {
                await r.setIsDocument(true)
                await r.addToPortal(portalLikeLink)
            }
            await portalLikeLink.setParent(sidebar)
        }

    }

    const gtd_host_pw=await plugin.powerup.getPowerupByCode(GTD_HOST_PW)
    const date_host_pw=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE)
    const tick_host_pw=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK)
    const tlkPW=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIMELINE_TYPE)
    const scenePW=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.SCENARIO) as Rem
    const activeItemPW=await plugin.powerup.getPowerupByCode(GTD_ACTIVE_PW.PW) as Rem

    var utils=await getUtils(plugin);

    //region Init container Interface(GTD Panel in sidebar)
    const gtdContainerInterface=await plugin.powerup.getPowerupByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE)
    if( gtdContainerInterface)
    {

        // if `PanelInterface` has left a portal in the sidebar, function will think that
        const testVar=(await gtdContainerInterface.portalsAndDocumentsIn());
        let flag=true;
        for(const toCheck of testVar )
        {
            if(toCheck.parent===sidebar._id)
                flag=false;
        }

        if(flag)
        {
            const remRef= await utils.createReferenceFor(gtdContainerInterface,sidebar);
            await remRef.setBackText(await plugin.richText.text("this rem cannot be removed or the container will be duplicated in the sidebar. If you don't wanna this container interface shown in sidebar, just delete the portal with leaving this reference here.").value())
            await remRef.setPracticeDirection("none");
            await remRef.setEnablePractice(false);
            // todo :maybe the plugin did not  pass the marketplace check due to operating the sidebar is a premium feature?
            await addToSidebar(gtdContainerInterface)
        }
    }
    gtdContainerInterface?.setIsDocument(true)
    //endregion

    // region Init GTD host

    if(!gtd_host_pw||!date_host_pw||!tick_host_pw||!tlkPW){
        await plugin.app.toast("bad...")
        console.warn(gtd_host_pw)
        console.warn(date_host_pw)
        console.warn(tick_host_pw)
        console.warn(tlkPW)
        return
    }
    await hostUniqueRectify(GTD_HOST_PW,GTD_LOGGER_PW_CODE.LOGGER_PW)
    // endregion

    const treat_as_slot=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS)
    //the host representing "TREAT_AS" property
    const act_slot_host=treat_as_slot&& await utils.getHostRemOf(treat_as_slot)
    if(!(treat_as_slot&&act_slot_host))return



    const timeLineTypeHost=await utils.getHostRemOf(tlkPW);
    const gtdHost=await utils.getHostRemOf(gtd_host_pw);
    const sceneHost=await utils.getHostRemOf(scenePW);
    await sceneHost.setIsDocument(true);


    //region Init GTD action hosts and corresponding containers

    // const nowContainerHost


    await gtdHost.setIsDocument(true);

    //region Init containers
    if(act_slot_host)
    {
        await genHostPropertiesWithLog(act_slot_host,treat_as_slot,HostType.OPTIONS,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS)
        for(const act of act_logger_slotCode_list)
        {

            //if an  "option of action" does not have corresponding containers, it is not a real option for an action.
            let container_slot=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,"c"+act[1])
            if(!(container_slot))continue;
            // create corresponding container rems for action.
            // well, this `"c"+act[1]` can filter out containers not serving for the actions
            await supplyHostPropertyVal(act_slot_host,ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,"c"+act[1],HostType.CONTAINER)

        }
    }
    //endregion

    // register options of TickType_Slot under the host
    await genHostPropertiesWithLog(timeLineTypeHost,tlkPW,HostType.OPTIONS,reverseObj(TIME_TK_PW_CODE.TICK_TYPE))

    //endregion




    //region Init Commands
    await plugin.app.registerCommand({
        quickCode:"gin",
        id:"tag_into_tray",
        name:"Into GTD Tray",
        action:async ()=>{
            let focus=await plugin.focus.getFocusedRem()
            await focus?.addTag(gtdHost)
            await focus?.addPowerup(GTD_ACTIVE_PW.PW)
        }
    })
    await plugin.app.registerCommand({
        quickCode:"stamp",
        id:"tag_as_timestamp",
        name:"Tag as Timestamp",
        description:"Tag the rem as a Time Stamp('#TimeTick' in this rem)",
        action:async ()=>{
            const focus=await plugin.focus.getFocusedRem()
            focus?.addPowerup(TIME_TK_PW_CODE.TICK_PW)
        }
    })

    await plugin.app.registerCommand({
        id:"clear_all_inactive_gtd_item",
        quickCode:"clrig",
        name:"Clear all disabled GTD Items",
        action:async ()=>{
            const items=await gtdHost.taggedRem();
            for(const it of items) {
                if(!await it.hasPowerup(GTD_ACTIVE_PW.PW))
                    await it.removeTag(gtdHost._id,true)
            }
        }
    })

    await plugin.app.registerCommand({
        id:"tag_all_children_into_tray",
        quickCode:"agin",
        name:"All Children Into GTD Tray",
        action: async ()=>{
            let focus=await plugin.focus.getFocusedRem()
            if(!focus)return
            for(let ch of await focus.getChildrenRem()){
                await ch.addTag(gtdHost)
                await ch.addPowerup(GTD_ACTIVE_PW.PW)
            }
        }

    })

    //endregion




    //region Functions to deploy templates from powerUps to hosts

    /**
     * function to check whether the powerUp has only one host
     * @param pw the powerUp to check
     * @return a enum value to indicate the uniqueness state of the host which "pw" owns
     */
    async function hostUniqueCheck(pw:Rem){
        //const pw=await plugin.powerup.getPowerupByCode(pwCode)
        if(!pw)return HostCheckResult.INVALID_4_SRC_NOT_EXIST;
        let hostList=await pw.taggedRem()
        if(hostList&&hostList.length<=0)return HostCheckResult.NOT_EXIST
        if(hostList.length>1)return HostCheckResult.NOT_UNIQUE
        if(hostList.length===1)return HostCheckResult.UNIQUE
    }

    /**
     * a wrap on "genHostPropertiesWithLog" to reassure each of the hosts is unique for their powerUp.
     * if host does not exist, a new rem will be created for the powerUp as a host and tagged by the powerUp.
     * @param pwCode powerUp code for the root Host
     * @param loggerCode the code of the powerUp to deploy its template onto the root Host
     */
    async function hostUniqueRectify(pwCode:string,loggerCode:string){
        const pw=await plugin.powerup.getPowerupByCode(pwCode);
        if(!pw)return
        let host
        const checkCode=await hostUniqueCheck(pw)
        switch (checkCode) {
            case HostCheckResult.INVALID_4_SRC_NOT_EXIST: return;
            case HostCheckResult.UNIQUE:
                // host=(await pw.taggedRem())[0]
                host=await utils.getHostRemOf(pw);
                await genHostPropertiesWithLog(host,loggerCode)
                break;
            case HostCheckResult.NOT_EXIST:
                host=await plugin.rem.createRem()
                if(!host)return
                await host.setText(["Host"])
                await genHostPropertiesWithLog(host,loggerCode)
                await host.addPowerup(pwCode)
                break;
            case HostCheckResult.NOT_UNIQUE:

                // leave the oldest host and dismiss the other hosts
                let hostList=await pw.taggedRem()
                if(!hostList||!hostList.length)return;
                let earliestRem=hostList[0]
                for(let h of hostList)
                {
                    if(earliestRem.createdAt>h.createdAt)
                        earliestRem=h
                }
                for(let host of hostList)
                {
                    if(earliestRem._id!==host._id){}
                        await host.removePowerup(pwCode)
                }
                await genHostPropertiesWithLog(earliestRem,loggerCode)
                break;
        }
    }

    /**
     * Apply the properties or container from the template in pwCode & slotCode to one host
     * @param host the rem to apply
     * @param pwCode the code of powerUp as the template of hosts
     * @param slotCode the PW slot code or option Rem as the tagger of the properties of the host
     * @param options the type of the slots in template—— if options is `HostType.CONTAINER` this function will duplicate the `host` as a container.
     */
    async function supplyHostPropertyVal(host:Rem,pwCode:string,slotCode:string|Rem,options:HostType){

        const slot=(typeof slotCode==="string") ? await plugin.powerup.getPowerupSlotByCode(pwCode,slotCode): slotCode

        if(!slot)
        {
            await plugin.app.toast("slot not found...")
            return
        }
        //region to reassure the uniqueness of tagged rem of `slot` for it should tag its unique property which is under the host.

        const hostProps=await slot.taggedRem()
        // const slotEnums=await slot.children
        // const norm=1+(slotEnums?.length||0)
        const norm=1
        if(hostProps&&hostProps.length===norm)
            return;
        if(hostProps.length>norm)
            for(let ba of hostProps)
            {
                if(ba.parent!==slot._id)
                    await ba.removeTag(slot._id)
            }

        //endregion
        const property = await plugin.rem.createRem();
        if(options===HostType.CONTAINER)
        {
            property && gtdContainerInterface && await property.setParent(gtdContainerInterface)

        }
        else{
            await property?.setParent(host);

        }

        await property?.addTag(slot)
        slot.text &&   await utils.updateRemTextWithCreationDebounce(property,slot.text)  // await property?.setText(slot.text);
        await property?.setIsProperty(options===HostType.PROPERTY);
        return property;
    }

    /**
     * apply the properties/options from the PowerUp template to the host PowerUp has tagged, in batch.
     * @param host
     * @param loggerLike rem to provide template to the host, can be PowerUp itself or properties of powerUp
     * @param hType the type of template slot:  Options ? Properties? Container taggers?
     * @param optSet a object used to figure out rems to be filtered out, which are under "loggerLike" and should not be template slots (e.g. "QueryTable")
     */
    async function genHostPropertiesWithLog(host:Rem, loggerLike:string|Rem, hType=HostType.PROPERTY, optSet:any=undefined){
        if(hType===HostType.PROPERTY)
        {
            if(typeof loggerLike!=="string")return
            const logger=await plugin.powerup.getPowerupByCode(loggerLike);
            const slotCodesObj=PW2SLOTS.get(loggerLike)
            const slotCodesArr=slotCodesObj && Object.entries(slotCodesObj)
            if(!(logger&&slotCodesArr))return
            for(let slotCode of slotCodesArr)
            {
                await supplyHostPropertyVal(host,loggerLike,slotCode[1],hType)
            }
        }
        else if(hType===HostType.OPTIONS)
        {
            if(typeof loggerLike==="string"||!optSet)return

            let slotLikes=await loggerLike.getChildrenRem()
            // load the options of slots (if exists)
            for(const opt of slotLikes)
            {

                if(opt.text)
                {
                    const text=await plugin.richText.toString(opt.text)
                    if((text in optSet))
                    {
                        await supplyHostPropertyVal(host,"",opt,HostType.OPTIONS)

                    }
                }
            }
        }
    }

    //endregion


    const prjContainer=await utils.getCollected(undefined,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Project) as Rem;



    //region Event handlers added here

    plugin.event.addListener(AppEvents.RemChanged,gtdHost._id,async ()=>{
        const items =await gtdHost.taggedRem();
        for(const it of items){
            if(!await it.hasPowerup(GTD_ACTIVE_PW.PW)){
                await it.addPowerup(GTD_ACTIVE_PW.PW);
            }
        }
    })

    plugin.event.addListener(AppEvents.RemChanged,prjContainer._id,async ()=>{
        gtdListenerQueue= gtdListenerQueue.then(async ()=>{
            for(const r of await prjContainer.taggedRem())
            {
                let itemTagRemoved=true;
                for(const tag of await r.getTagRems())
                {
                    if(tag._id===gtdHost._id)itemTagRemoved=false;
                }
                if(itemTagRemoved&&r.parent!==prjContainer._id)
                {
                    plugin.event.removeListener(AppEvents.RemChanged,r._id);
                }
                await utils.tagSubItem(r);

            }

            // for(const prjlike of await prjContainer.getChildrenRem())
            // {
            //     if(prjlike.text&&await plugin.richText.length(prjlike.text))
            //     {
            //         if(!(await prjlike.isTable())&&!(await prjlike.isProperty())){
            //             await tagSubItem(prjlike)
            //         }
            //     }
            // }
        })

    })

    //add listener for Scenario rems, remove their tag of `SCENARIO` once they are not the children of `SceneHost`
    plugin.event.addListener(AppEvents.RemChanged,sceneHost._id,async ()=>{

        gtdListenerQueue= gtdListenerQueue.then(async (value)=>{

            const sceneSet=new Set<string>((await sceneHost.getDescendants()).map(r=>r._id))
            //Note: a rem is representing a scenario only when it is a descendant of the "sceneHost"
            for(const scene of (await sceneHost.taggedRem()))
            {

                if(scene.parent===sceneHost._id){
                    //DONE maybe this `scene` is actually type of scenes in future version?
                    // answer: a scene classifier is not a scene but a rem whose parent is "sceneHost" and that is not tagged by "sceneHost".
                }
                if ( sceneSet.has(scene._id) ){
                    continue
                }
                await scene.removeTag(sceneHost._id)
            }
        })



    })

    const disablerHandler= async ()=>{
        const refs=await utils.disablerHost.remsReferencingThis();
        for(const ref of refs)
        {
            const itemId=ref.parent;
            if(!itemId)continue;
            const item=await ref.getParentRem();
            if(!item)continue;
            let disablerCondRichText = await item.getTagPropertyValue(utils.disablerHost._id);
            const disablerCondStr=await plugin.richText.toString(disablerCondRichText);
            if("Yes"===disablerCondStr)
            {
                await item.removePowerup(GTD_ACTIVE_PW.PW);
            }
            else if("No"===disablerCondStr)
            {
                await item.addPowerup(GTD_ACTIVE_PW.PW);
            }
        }
    }

    let disablerHandlerTimer:any=setInterval(disablerHandler,3600);

    plugin.event.addListener(AppEvents.RemChanged,utils.disablerHost._id,async ()=>{
        const refs=await utils.disablerHost.remsReferencingThis();

        // if(refs.length>0)
        // {
        //     disablerHandlerTimer= setInterval(disablerHandler,3600);
        // }
        if(!!disablerHandlerTimer&&0===refs.length){
            clearInterval(disablerHandlerTimer);
            disablerHandlerTimer=null;
        }
        else if(!disablerHandlerTimer&&refs.length>0)
        {
            disablerHandlerTimer=setInterval(disablerHandler,3600);
        }
    })
    //endregion





    //region Definitions of event listener handler implementing "Treat as" actions.

    const waitListHandler=async (r:GTDItem)=>{
        let dateDocL=await r.getDateRemIdWithProperty()

        // if specific time tick was not designated, place items into references of "Today" PowerUp at that DailyDoc
        // (Or left them in the DailyDoc directly?)

        if(dateDocL&&dateDocL.length)
        {

            //move r into WAIT list
            await r.getContainedWithOwner(ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Later)
            //create reference of "r" in Daily Doc
            await r.linkGTDItemToDairy()
            //remove the tag "GTD items"
            await r.setIsDisabled(true)
        }
        else
        {
            await plugin.app.toast("A date as a tip needed if you want make it LATER to do")
        }
    }
    const awaitListHandler=async (r:GTDItem) =>{
        await r.getContainedWithOwner(ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Delegate)

        //DONE if "scenario" does not exist, a toast is needed to inform the user.
        if(!await r.getContainedWithScenario())
        {
            await plugin.app.toast("Assignee(s) need to be specified in SCENARIO when you wanna delegate it to someone")
        }
        // XXX : I cannot come up with a better idea in such a haste
        //portal the item into Daily Doc
        await r.linkGTDItemToDairy()
        //remove the tag "GTD items"
        await r.setIsDisabled(true)

    }
    const projectListHandler=async (r:GTDItem) =>{
        // move item rem into project folder and remove the tag "GTD items"
        // await getCollected(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Project);
        await r.getContainedWithOwner()

        await r.linkGTDItemToDairy()

        //the children of a project item should be a GTD item by default(except rems containing properties)
        // plugin.event.removeListener(AppEvents.RemChanged,r._id)


        //remove the tag "GTD items"
        await r.setIsDisabled(true)
        await r.rem.addTag(prjContainer._id)
    }

    const refListHandler=async (r:GTDItem) =>{
        //move the item into the "REFERENCE/Successive Ones" folder
        //await getCollected(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Reference);
        //DONE (IMPORTANT) : what about the logic when "r" has property "r.OwnerProject"?
        //todo how to get items contained when the items has other property?
        // (partially done:SCENARIO/DATE/OWNER have their containing logic)
        await r.getContainedWithOwner(ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Reference)




        //remove the tag "GTD items"
        await r.setIsDisabled(true)
    }
    const wasteListHandler = async (r:GTDItem) =>{
        await utils.getCollected(r.rem, ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.WasteBin,true);
        //portal the item into Daily Doc
        await r.linkGTDItemToDairy();


        //remove the GTD tag and related properties
        await r.setIsDisabled(true)
    }
    const wishesListHandler = async (r:GTDItem) =>{
        await r.getContainedWithOwner(ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.SomeDay);
        //move the item into Daily Doc
        if(!await r.linkGTDItemToDairy())
        {
            //DONE: add it to Card Practice as a reminder
            //todo : maybe a default option for "Tick Type" named "unspecified"?
            // or just enable users to setup their own properties under the properties?
            // (partially done: `utils.getPropertyRemOfHostAsRemWithBuiltinOptions` ready)

            const propRem= await utils.setUpEnumValForHostProperty(r.rem,tlkPW,TIME_TK_PW_CODE.TICK_TYPE.LOG)
            await propRem?.setEnablePractice(true);
            await propRem?.setPracticeDirection("forward");
            // await plugin.app.toast("Date to reminder is default.").then(()=>{
            //     setTimeout(()=>{
            //         plugin.app.toast(" so the Rem has been added to practice queue to reminder");
            //     },1200)
            // });

        }
        //remove the GTD tag and related properties
        await r.setIsDisabled(true);
    }
    const nowListHandler = async (r:GTDItem)=>{
        await r.rem.setIsTodo(true);
        // "NOW" items need not be removed from the tableview for it shall be processed at once.
        await r.getCollectedWithOwner(ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Now)
        plugin.event.addListener(AppEvents.RemChanged,r.rem._id,async ()=>{
            gtdListenerQueue= gtdListenerQueue.then(async ()=>{

                if((await r.rem.getTodoStatus())==="Finished")
                {
                    //remove the tag "GTD items"
                    await r.setIsDisabled(true)
                    //(await utils.getHostRemOf(await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW, ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Now) as Rem)
                    await utils.dropOutRedundantLink(r.rem,
                        async (ref)=>ref.parent===(await utils.getCollected(undefined,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Now)as Rem)._id)

                    plugin.event.removeListener(AppEvents.RemChanged,r.rem._id);
                }
            })

        })
    }
    //endregion

    //region Init event listeners




    const handlerMap=new Map(
        [
            ["Later",waitListHandler],
            ["Delegate",awaitListHandler],
            ["Project",projectListHandler],
            ["SomeDay",wishesListHandler],
            ["Reference",refListHandler],
            ["WasteBin",wasteListHandler],
            ["Now",nowListHandler]
        ]
    );



    //let gtdActionQueue=new Set()
    //const gtdActionQueueHead=new Promise<void>(()=>undefined);
    for(const actSlot of await treat_as_slot?.getChildrenRem())
    {
        const slotHostAsActOption=await utils.getHostRemOf(actSlot)
        if(!slotHostAsActOption)
        {
            //const slotText=actSlot.text && await plugin.richText.toString(actSlot.text)
            // if(slotText)
            // await plugin.app.toast(slotText+" is nowhere to be found...")


            //region (HAVING BEEN COMMENTED)  FOR MY DEV USE:remove the powerUps unexpectedly created due to previous before
            //  if(!actSlot.isTable())await actSlot.remove();
            //endregion

            //fix (Done) : "return", "continue" or else
            //continue, for there are other `actSlot` to attach their listeners.
            continue
        }



        //when ANY one host slot with this handler is changed, the handler will be triggered
        //then processing ALL the GTD items tagged with the "GTD Host"
        //so there may be "concurrent" conflicts between these handlers, which will duplicate the edits to Rems.
        //"handlerCaller" wraps the handlers to filter the duplicate edit
        let callerTriggered=false;
        const handlerCaller=async ()=>{
            if(callerTriggered)return
            callerTriggered=true;
            if(slotHostAsActOption._id!==(await utils.getHostRemOf(actSlot))._id)
            {
                plugin.event.removeListener(AppEvents.RemChanged,slotHostAsActOption._id)
                return
            }
            let activeGtdItems=await activeItemPW.taggedRem();
            // let handlerQueue:Promise<void>|null=null;
            for(const it of activeGtdItems)
            {
                const gtdIt= new GTDItem(it,plugin,utils)
                // the richText type of value specifying the expected treatment to a GTD item (e.g. Later/Delegate/SomeDay...)
                const actVal=await  it.getTagPropertyValue(act_slot_host._id);
                // the option rem is one kind of host that is created and tagged by the powerUp representing the option, and host will implement the functions for the Option-type property
                const actIds=await plugin.richText.getRemIdsFromRichText(actVal);
                //the corresponding powerUp of the var "actVal" , for the action to a GTD item
                const actPw=(await slotHostAsActOption.getTagRems())[0]
                if(!(actPw&&actPw.text))continue
                const actCommand=await plugin.richText.toString(actPw.text)
                if(!actIds.length)continue;
                if(actIds[0]===slotHostAsActOption._id)
                {
                    const handle=handlerMap.get(actCommand.trim());

                    if(handle&&await gtdIt.isTaggedWithHost(gtdHost._id)){
                        //handlerQueue=handlerQueue ? handlerQueue.then(async ()=>{await handle(it);}) : handle(it);
                        await handle(gtdIt);
                    }
                }
            }

            gtdListenerQueue=gtdListenerQueue.then(handlerCaller);
            callerTriggered=false;
        }
        await handlerCaller();
        plugin.event.addListener(AppEvents.RemChanged,slotHostAsActOption._id,handlerCaller)
    }


    //endregion

    return !!gtdHost;
}
