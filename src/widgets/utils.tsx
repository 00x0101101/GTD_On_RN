import {
    filterAsync,
    PORTAL_TYPE,
    ReactRNPlugin,
    Rem,
    RichTextInterface,
    SetRemType,
} from '@remnote/plugin-sdk';
import _ from 'lodash';
import { ACT_OPTIONS_LOGGER_PW_CODE, GTD_HOST_PW, GTD_LOGGER_PW_CODE, TIME_TK_PW_CODE } from './consts';
import moment from 'moment/moment';


const debounceMap=new Map<string,number>();
const freqLimitsPerSpan=5;
const freqSpanInMS=1500;
let spanTimerHandler:NodeJS.Timer|null=null;

async function getHostRemOf(pw:Rem){
    return (await pw.taggedRem())[0]
}
async function getAllPropOf(tagRem:Rem|undefined){
    let children= await tagRem?.getChildrenRem()
    return children && await filterAsync(children,c=>c.isProperty())
}


export const getUtils=async (plugin:ReactRNPlugin)=>{
    const gtd_host_pw = await plugin.powerup.getPowerupByCode(GTD_HOST_PW) as Rem;
    const gtdHost = await getHostRemOf(gtd_host_pw);
    const ownerPrjPW =await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW, GTD_LOGGER_PW_CODE.LOGGER_SLOTS.OWNER_ITEM) as Rem
    const ownerPrjHost = await getHostRemOf(ownerPrjPW);
    const date_host_pw=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE) as Rem
    const tick_host_pw=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK) as Rem
    const tlkPW=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIMELINE_TYPE) as Rem
    const scenePW=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.SCENARIO) as Rem
    const disablePW = await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.DISABLED) as Rem
    const dateHost=await getHostRemOf(date_host_pw);
    const tickHost=await getHostRemOf(tick_host_pw);
    const sceneHost=await getHostRemOf(scenePW);
    const timeLineTypeHost=await getHostRemOf(tlkPW);
    const disablerHost=await getHostRemOf(disablePW);
    const hosts=[gtdHost,ownerPrjHost,dateHost,tickHost,sceneHost,timeLineTypeHost,disablerHost]

    return new Utils(plugin,hosts)
}


export class Utils{
    private plugin: ReactRNPlugin;
    readonly gtdHost: Rem;
    readonly ownerPrjHost: Rem;
    readonly getHostRemOf: (pw: Rem) => Promise<Rem>;
    readonly dateHost: Rem;
    readonly tickHost: Rem;
    readonly sceneHost: Rem;
    readonly timeLineTypeHost: Rem;
    readonly disablerHost:Rem;
    constructor(plugin: ReactRNPlugin,hosts: Rem[]) {
        this.plugin = plugin;
        this.gtdHost=hosts[0];
        this.ownerPrjHost=hosts[1];
        this.dateHost=hosts[2];
        this.tickHost=hosts[3];
        this.sceneHost=hosts[4];
        this.timeLineTypeHost=hosts[5];
        this.disablerHost=hosts[6];
        this.getHostRemOf=getHostRemOf;
    }





    /**
     * a function wrapping `rem.setText` to detect explosive rem creation with duplicate context
     * to protect users' note from potential crash on this plugin
     */
    public async  updateRemTextWithCreationDebounce (r:Rem|undefined,text:RichTextInterface){
        const hashKey=text.length.toString()+","+await this.plugin.richText.length(text);
        const freqPerSpan=debounceMap.get(hashKey);


        if(typeof freqPerSpan!=='number')
        {
            debounceMap.set(hashKey,0);
            return
        }

        if(freqPerSpan>freqLimitsPerSpan)
        {
            await this.plugin.app.toast("Crash happened in GTD Plugin.").then(()=>{
                setTimeout(()=>{
                    this.plugin.app.toast("Please contact plugin author by committing a GitHub issue");
                },3000)
            })
            throw new Error("Duplicate rem created violently");

        }
        if(!spanTimerHandler)
            spanTimerHandler=setInterval(()=>{
                debounceMap.clear();
            },freqSpanInMS)
        debounceMap.set(hashKey,freqPerSpan+1);

        r?.setText(text);
    }



    /**
     * tag children of `r` to be a GTD Item which is leaf rem without tag "Finished To-Do"
     * @param r
     */
    public async tagSubItem(r:Rem){
        if(await r.isTodo()&&"Finished"===await r.getTodoStatus())
            return;

        if(await r.getPortalType()===PORTAL_TYPE.PORTAL)
            return;



        let hasGotSubItem=false;

        for(const child of await r.getChildrenRem())
        {
            if(await child.isTodo()&&"Finished"===await child.getTodoStatus())
                continue;
            if(child.text&&await this.plugin.richText.length(child.text))
            {
                if((await child.getChildrenRem()).length!==0)
                    continue;
                const rRefs = await child.remsBeingReferenced();

                //if the child is a rem containing property values, it will not be added as a GTD item by this function


                hasGotSubItem=true;
                const resultArr=await Promise.all(rRefs.map(rr=>rr.isProperty()))
                let suitForTag=!resultArr.filter(_.identity).length;

                if(suitForTag)
                {
                    await child.addTag(this.gtdHost);
                    // await next.addTag(gtdHost);
                    await child.setTagPropertyValue(this.ownerPrjHost._id,await this.plugin.richText.rem(r).value())

                }
            }
        }
        //unexpected recurrent won't occur
        //for the sub-item has not been project yet
        //fixed: this thought is wrong for the creation of ref `next` will trigger the listener of `r`—— debounce filter has been added in `createReferenceFor`
        if(!hasGotSubItem)
        {
            //fixed : Duplicate creation error triggered here "from argument `prjLike`"
            const next=await this.createReferenceFor(r,r);
            //await next.setText(await this.plugin.richText.text("Next Action of ").rem(r).value());
            await this.updateRemTextWithCreationDebounce(next,await this.plugin.richText.text("Next Action ").value())
            await next.setTagPropertyValue(this.ownerPrjHost._id,await this.plugin.richText.rem(r).value())

            // const nextCallback=async ()=>{
            //     plugin.event.removeListener(AppEvents.RemChanged,next._id,nextCallback);
            //     const newNext=await createReferenceFor(r,r);
            //     await updateRemTextWithCreationDebounce(next,await this.plugin.richText.text("Next Action ").value())
            //
            // }
            // plugin.event.addListener(AppEvents.RemChanged,next._id,nextCallback)
        }
    }

    public async dropOutRedundantLink(r:Rem,condition:(arg0: Rem)=>Promise<boolean>){
        for(const refR of await r.remsReferencingThis())
        {
            if(await condition(refR))
            {

                //what User needs is to remove the reference link insteadof removing the whole rem carrying the reference!
                let text = refR.text;
                if(text){
                    text = text.filter((textEle)=>{
                        return !("q"===textEle.i&&textEle._id===r._id)
                    })
                    await refR.setText(text);
                }

                // await refR.remove()
            }
        }
    }

    public async createRemWithText(text:RichTextInterface){
        const newRem=await this.plugin.rem.createRem() as Rem;
        // await newRem.setText(text);
        await this.updateRemTextWithCreationDebounce(newRem,text);
        return newRem
    }

    /**
     * literally. `undefined` will be returned if portal is failed to create
     * @param r
     * @param uniqUnder if set, duplicate portal within the children of `uniqUnder` will be removed
     */
    public async createPortalForItem(r:Rem,uniqUnder:undefined|Rem=undefined){

        if(uniqUnder)
        {
            for(const por of await r.portalsAndDocumentsIn())
            {
                if(por._id!==r._id&&por.parent===uniqUnder._id&&await por.getPortalType()===PORTAL_TYPE.PORTAL)
                    return por;
            }
        }

        const portal=await this.plugin.rem.createPortal();
        if(!portal)return;
        await r.addToPortal(portal);
        if(uniqUnder)await portal.setParent(uniqUnder)
        return portal;
    }

    /**
     * create a reference rem for "r"
     * @param r the rem to reference
     * @param refParent If this parameter exists, the ref rem will be placed under this.
     *        If this parameter exists and there has already been a ref under `r`, the existing ref will be returned without creating a new rem.
     */
    public async createReferenceFor(r:Rem,refParent?:Rem){
        if(refParent)
        {
            for(const refR of await r.remsReferencingThis())
            {
                if(refR.parent===refParent._id)
                    return refR
            }
        }

        const refContent=await this.plugin.richText.rem(r).value()
        const ref=await this.createRemWithText(refContent)
        if(refParent)await ref.setParent(refParent)
        return ref
    }


    /**
     * get one property of `Host` as Rem and its builtin options, which is specified by `templateSlot`
     * @param templateSlot the code of PW or PW slot tagging the property under the host.
     * @return an `Array` containing 2 items: `[propertyRem:Rem, BuiltinOptions:Rem[] ]`, return `undefined` if template is not valid
     */
    public async getPropertyRemOfHostAsRemWithBuiltinOptions(templateSlot:string){
        const pwSlot=  await this.plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,templateSlot)
        if(!pwSlot)return undefined;
        return  [await getHostRemOf(pwSlot) as Rem,await pwSlot.getChildrenRem()] as const;
    }



    /**
     * set one property for the rem `r` tagged with the host, in a way Plugin Builtin function `r.setPowerupProperty`  does
     * @param r
     * @param templateSlot the code of powerUp/powerUpProperty as template, or the template PW rem itself.
     * @param valEnum the template PW enum code having generated the enum values to select
     * @return the rem containing `r.property` modified in this function
     */
    public async  setUpEnumValForHostProperty(r:Rem,templateSlot:string|Rem,valEnum:string){

        /**
         * @return [PropertySlotRem, [Options of PropertySlot]]
         */
        const getSlotWithOpts =async ()=>{
            if(typeof templateSlot==="string")
            {
                return await this.getPropertyRemOfHostAsRemWithBuiltinOptions(templateSlot)
            }
            else
            {
                return [templateSlot, await (await getHostRemOf(templateSlot)).getChildrenRem()] as const
            }
        }
        const arr=await getSlotWithOpts();

        if(!arr)return;

        const slotHost= arr[0];
        for(const opt of arr[1])
        {
            if(!await opt.isPowerupEnum()||!opt.text)continue;
            if(valEnum===await this.plugin.richText.toString(opt.text))
            {
                const optHost=await getHostRemOf(opt)as Rem;
                await r.setTagPropertyValue(slotHost._id,await this.plugin.richText.rem(optHost).value())
            }
        }
        return await r.getTagPropertyAsRem(slotHost._id);
    }


    //region Functions for GTD panel with containers in sidebar

    /**
     * move GTD item "r" into one container rem in the Container Panel
     *
     * (collect, contain and complete the GTD items to become the conqueror of our daily issue \^_\^ )
     * @param r GTD items to contain, if left void, the container will be returned without any
     * @param containerCode the code specifying the container rem
     * @param indirectMoveByPortal  if set to be true, `r` will get collected by leaving a portal under its owner instead of being moved to that one directly
     */
    public async getCollected(r:Rem|undefined,containerCode:string,indirectMoveByPortal:boolean=false){
        let containerPW
        try {
            containerPW=(await this.plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,containerCode));
        }
        catch (e) {
            containerPW=await this.plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE,containerCode)
        }
        if(!containerPW)return
        const container=await getHostRemOf(containerPW)
        container &&r  && ( indirectMoveByPortal? (await this.createPortalForItem(r,container)) : r.parent!==container._id &&  await r.setParent(container));
        return container
    }


    //endregion





    /**
     * create a rem with specific content as a GTD item rem
     * @param text the content of the rem to create
     * @param itemType which type is this item? a rem representing a project or a scenario?
     * @return the created rem. But if text is blank, undefined will be returned
     */
    public async createContainedITEMWithRichText(text: RichTextInterface, itemType: string = ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Project){
        if(text.length===0)return
        const newRem=await this.createRemWithText(text)
        await this.getCollected(newRem,itemType)
        return newRem
        //todo: it is the work of next stage to introduce the "Natural Planning Model" functionality to the action tag "Project"
        // "Natural Planning Model" is a miniature of Project Management( WBS/schedule with DAG topological sort/resource regulation/... )
        /*const prjActionHost=await getHostRemOf((await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Project)) as Rem);
          await newRem.addTag(prjActionHost._id);
        * */
    }


    public async setupStampWithRichText(daily:Rem|undefined,stampRichText:RichTextInterface) {
        if (!(daily)) {
            await this.plugin.app.toast('Failed to Locate Dairy');
            return;
        }
        let stamp = (await this.plugin.rem.findByName(stampRichText, daily._id)) || (await this.plugin.rem.createRem());
        stamp?.setType(SetRemType.DESCRIPTOR);
        if (!stamp) {
            await this.plugin.app.toast('Failed to Create Stamp');
            return;
        }

        await stamp.setParent(daily);
        // await stamp.setText(stampRichText);
        await this.updateRemTextWithCreationDebounce(stamp,stampRichText);
        await stamp.addPowerup(TIME_TK_PW_CODE.TICK_PW);
        return stamp;
    }
    public async createStampWithDate(date:Date|undefined){
        date=date||new Date();
        let mo=moment(date);

        let stampText=`${mo.format("HH:mm")}`
        let stampRichText=await this.plugin.richText.text(stampText).value();
        let daily=await this.plugin.date.getDailyDoc(date);

        return await this.setupStampWithRichText(daily,stampRichText);
    }

}







