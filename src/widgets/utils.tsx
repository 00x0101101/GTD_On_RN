import { filterAsync, PORTAL_TYPE, ReactRNPlugin, Rem, RichTextInterface } from '@remnote/plugin-sdk';
import _, { gt } from 'lodash';
import { GTD_HOST_PW, GTD_LOGGER_PW_CODE } from './consts';


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
    return new Utils(plugin,gtdHost,ownerPrjHost)
}


export class Utils{
    private plugin: ReactRNPlugin;
    private gtdHost: Rem;
    private ownerPrjHost: Rem;
    private getHostRemOf: (pw: Rem) => Promise<Rem>;
    constructor(plugin: ReactRNPlugin,gtdHost:Rem,ownerPrjHost:Rem) {
        this.plugin = plugin;
        this.gtdHost=gtdHost;
        this.ownerPrjHost=ownerPrjHost;
        this.getHostRemOf=getHostRemOf;
    }

    // public async init()
    // {
    //     const gtd_host_pw = await this.plugin.powerup.getPowerupByCode(GTD_HOST_PW) as Rem;
    //     this.gtdHost = await getHostRemOf(gtd_host_pw);
    //     const ownerPrjPW =await this.plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW, GTD_LOGGER_PW_CODE.LOGGER_SLOTS.OWNER_ITEM) as Rem
    //     this.ownerPrjHost = await getHostRemOf(ownerPrjPW);
    // }





    /**
     * todo:
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
                await refR.remove()
            }
        }
    }

    public async createRemWithText(text:RichTextInterface){
        const newRem=await this.plugin.rem.createRem() as Rem;
        // await newRem.setText(text);
        await this.updateRemTextWithCreationDebounce(newRem,text);
        return newRem
    }
//
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



}







