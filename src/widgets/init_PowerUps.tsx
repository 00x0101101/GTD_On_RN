import {
    AppEvents,
    BuiltInPowerupCodes,
    filterAsync,
    PropertyLocation,
    PropertyType,
    ReactRNPlugin,
    Rem,
    RichTextInterface,
    SelectSourceType,
    SetRemType,
} from '@remnote/plugin-sdk';
import {
    ACT_OPTIONS_LOGGER_PW_CODE, aspect_containers,
    GTD_HOST_PW,
    GTD_LOGGER_PW_CODE,
    HostCheckResult,
    HostType,
    PW2SLOTS, RemPropertyType,
    TIME_TK_PW_CODE,
} from './consts';
import moment from 'moment';

let utils

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

export const init_PowerUps =async (plugin:ReactRNPlugin) => {

    //region Functions to deploy templates from powerUps to hosts

    /**
     * function to check whether the powerUp has only one host
     * @param pw the powerUp to check
     * @return a enum value to indicate the uniqueness state of the host which "pw" owns
     */
    const hostUniqueCheck=async (pw:Rem)=>{
        //const pw=await plugin.powerup.getPowerupByCode(pwCode)
        if(!pw)return HostCheckResult.PW_NOT_EXIST;
        let hostList=await pw.taggedRem()
        if(hostList&&hostList.length<=0)return HostCheckResult.HOST_NOT_EXIST
        if(hostList.length>1)return HostCheckResult.HOST_NOT_UNIQUE
        if(hostList.length===1)return HostCheckResult.HOST_UNIQUE
    }

    /**
     * a wrap on "genHostPropertiesWithLog" to reassure each of the hosts is unique for their powerUp.
     * if host does not exist, a new rem will be created for the powerUp as a host and tagged by the powerUp.
     * @param pwCode powerUp code for the root Host
     * @param loggerCode the code of the powerUp to deploy its template onto the root Host
     */
    const hostUniqueRectify=async (pwCode:string,loggerCode:string)=>{
        const pw=await plugin.powerup.getPowerupByCode(pwCode);
        if(!pw)return
        let host
        const checkCode=await hostUniqueCheck(pw)
        switch (checkCode) {
            case HostCheckResult.PW_NOT_EXIST: return;
            case HostCheckResult.HOST_UNIQUE:
                // host=(await pw.taggedRem())[0]
                host=await getHostRemOf(pw);
                await genHostPropertiesWithLog(host,loggerCode)
                break;
            case HostCheckResult.HOST_NOT_EXIST:
                host=await plugin.rem.createRem()
                if(!host)return
                await host.setText(["Host"])
                await genHostPropertiesWithLog(host,loggerCode)
                await host.addPowerup(pwCode)
                break;
            case HostCheckResult.HOST_NOT_UNIQUE:

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
     * Apply the properties from the template in pwCode & slotCode to one host
     * @param host the rem to apply
     * @param pwCode the code of powerUp as the template of hosts
     * @param slotCode the PW slot code or option Rem as the tagger of the properties of the host
     * @param options the type of the slots in template
     */
    const supplyHostPropertyVal=async (host:Rem,pwCode:string,slotCode:string|Rem,options:HostType)=>{

        const slot=(typeof slotCode==="string") ? await plugin.powerup.getPowerupSlotByCode(pwCode,slotCode): slotCode

        if(!slot)
        {
            await plugin.app.toast("slot not found...")
            return
        }
        const back=await slot.taggedRem()
        // const slotEnums=await slot.children
        // const norm=1+(slotEnums?.length||0)
        const norm=1
        if(back&&back.length===norm)
            return;
        if(back.length>norm)
            for(let ba of back)
            {
                if(ba.parent!==slot._id)
                    await ba.removeTag(slot._id)
            }
        const property = await plugin.rem.createRem();
        if(options===HostType.CONTAINER)
        {
            property && gtdContainerInterface && await property.setParent(gtdContainerInterface)

        }
        else{
            await property?.setParent(host);

        }

        await property?.addTag(slot)
        slot.text &&  await property?.setText(slot.text);
        await property?.setIsProperty(options===HostType.PROPERTY)

        return property
    }

    /**
     * apply the properties/options from the PowerUp template to the host PowerUp has tagged, in batch.
     * @param host
     * @param loggerLike rem to provide template to the host, can be PowerUp itself or properties of powerUp
     * @param hType the type of template slot:  Options ? Properties? Container taggers?
     * @param optSet a object to filter rems under "loggerLike" which should not be template slots (e.g. "QueryTable")
     */
    const genHostPropertiesWithLog =async (host:Rem, loggerLike:string|Rem, hType=HostType.PROPERTY, optSet:any=undefined) => {
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


    const getHostRemOf=async (pw:Rem)=>{
        return (await pw.taggedRem())[0]
    }
    const getAllPropOf=async (tagRem:Rem|undefined)=>{
        let children= await tagRem?.getChildrenRem()
        return children && await filterAsync(children,c=>c.isProperty())
    }

    utils={
        hostUniqueCheck:hostUniqueCheck,
        hostUniqueRectify:hostUniqueRectify,
        supplyHostPropertyValue:supplyHostPropertyVal,
        genHostPropertiesWithLog:genHostPropertiesWithLog,
        getHostRemOf:getHostRemOf,
        getAllPropOf:getAllPropOf,
    }

    //region Init PowerUps

    //region Init the TimeTick PW
    await plugin.app.registerPowerup('Time Tick', TIME_TK_PW_CODE.TICK_PW, 'The powerUp to tag the time ticks, mainly used in DailyDocs', {
        slots: [{
            code: TIME_TK_PW_CODE.TICK_SLOT,
            name: 'TickType',
            onlyProgrammaticModifying: true,
            hidden: true,
            propertyLocation:PropertyLocation.BELOW,
            enumValues:TIME_TK_PW_CODE.TICK_TYPE,
            defaultEnumValue:TIME_TK_PW_CODE.TICK_TYPE.LOG
        }]
    });
    //endregion

    //region Init the GTD Logger PW
    const gtd_logger_slot_list=Object.entries(GTD_LOGGER_PW_CODE.LOGGER_SLOTS)
    let gtdSlots: any[][] = [
        //USAGE: "THE_DATE" cannot be multiselect, or another GTD item needed to be created
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE, 'THE_DATE',PropertyLocation.BELOW, PropertyType.DATE,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK, 'TIME_TICK',PropertyLocation.ONLY_DOCUMENT, PropertyType.MULTI_SELECT,SelectSourceType.Relation,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.SCENARIO, 'SCENARIO',PropertyLocation.BELOW , PropertyType.TEXT,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIMELINE_TYPE, 'TIMELINE_TYPE',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.Enum,TIME_TK_PW_CODE.TICK_TYPE],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.OWNER_PROJECT, 'OWNER_PROJECT',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.AnyRem,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS, 'TREAT_AS',PropertyLocation.RIGHT, PropertyType.SINGLE_SELECT, SelectSourceType.Enum,allKeyObj(ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS)],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.MESSAGE, 'MESSAGE',PropertyLocation.ONLY_DOCUMENT, PropertyType.TEXT,undefined],
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

    //region util Functions

    const createRemWithText=async (text:RichTextInterface)=>{
        const newRem=await plugin.rem.createRem() as Rem;
        await newRem.setText(text);
        return newRem
    }
    // literally.
    const createPortalFor=async (r:Rem)=>{
        const portal=await plugin.rem.createPortal();
        if(!portal)return;
        await r.addToPortal(portal);
        return portal;
    }
    /**
     * create a reference rem for "r"
     * @param r the rem to reference
     * @param refParent if this parameter exists, the ref rem will be placed under this.
     */
    const createReferenceFor=async (r:Rem,refParent?:Rem)=>{
        const refContent=await plugin.richText.rem(r).value()
        const ref=await createRemWithText(refContent)
        if(refParent)await ref.setParent(refParent)
        return ref
    }

    //endregion


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
            const aspect=r[0] as keyof aspect_containers
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
    const ownerPrjPW=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.OWNER_PROJECT) as Rem
    const scenePW=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE,ACT_OPTIONS_LOGGER_PW_CODE.ASPECT_CONTAINERS.SCENARIO) as Rem

    //region Init container Interface(GTD Panel in sidebar)
    const gtdContainerInterface=await plugin.powerup.getPowerupByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE)
    if(gtdContainerInterface&&(!(await gtdContainerInterface.remsReferencingThis()).length|| (((await gtdContainerInterface.remsReferencingThis())[0].parent)!==sidebar?._id) ))
    {
        await createReferenceFor(gtdContainerInterface,sidebar)
        // todo :maybe the plugin did not  pass the marketplace check due to operating the sidebar is a premium feature?
        await addToSidebar(gtdContainerInterface)
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
    const act_slot_host=treat_as_slot&& await getHostRemOf(treat_as_slot)
    if(!(treat_as_slot&&act_slot_host))return



    const timeLineTypeHost=await getHostRemOf(tlkPW)
    const gtdHost=await getHostRemOf(gtd_host_pw)
    const dateHost=await getHostRemOf(date_host_pw)
    const tickHost=await getHostRemOf(tick_host_pw)
    const ownerPrjHost=await getHostRemOf(ownerPrjPW)
    const sceneHost=await getHostRemOf(scenePW)
    //region Init GTD action hosts and corresponding containers

    //region Init containers
    if(act_slot_host)
    {
        await genHostPropertiesWithLog(act_slot_host,treat_as_slot,HostType.OPTIONS,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS)
        for(const act of act_logger_slotCode_list)
        {

            let container_slot=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,"c"+act[1])
            if(!(container_slot))continue;
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
            focus?.addTag(gtdHost)
        }
    })
    await plugin.app.registerCommand({
        quickCode:"stamp",
        id:"tag_as_timestamp",
        name:"Tag as Timestamp",
        description:"Tag the rem as a Time Stamp('#TimeTick' in this rem)",
        action:async ()=>{
            const focus=await plugin.focus.getFocusedRem()
            focus?.addTag(tickHost)
        }

    })

    //endregion

    //region Functions for GTD panel in sidebar

    /**
     * move GTD item "r" into one container rem in the Container Panel
     *
     * (collect, contain and complete the GTD items to become the conqueror of our daily issue \^_\^ )
     * @param r GTD items to contain
     * @param containerCode the code specifying the container rem
     */
    const getCollected = async (r:Rem,containerCode:string) => {
        const containerPW=(await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,containerCode))||(await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE,containerCode));
        if(!containerPW)return;
        const container=await getHostRemOf(containerPW)
        container && await r.setParent(container);
        return containerPW
    }


    //endregion

    //region Functions for properties handling (except "Treat as" actions.)

    /**
     * get the property specified by "propertyId" of the rem "r" and return it as Rem
     * @param r
     * @param propertyId
     * @return
     *
     * when the property to return does not contain a reference, the param "type" will be ignored and the plain text itself will be returned.
     *
     * when `type==="Rem"` and the property to return contains a reference, but the Rem cannot be found (e.g. Privacy Rem or Deleted Rem), the function will return this id despite the "type" parameter
     */
    async function getPropertyOfRemAsRem(r:Rem,propertyId:string) {
        let propertyRichText=await r.getTagPropertyValue(propertyId)
        let results:string[];
        results=await plugin.richText.getRemIdsFromRichText(propertyRichText)
        const resultRems=await plugin.rem.findMany(results)
        if(resultRems?.length)
            return resultRems

    }

    //region Functions to process time-related things, like stamps and ticks
    async function setupStampWithRichText(daily:Rem|undefined,stampRichText:RichTextInterface) {
        if (!(daily)) {
            await plugin.app.toast('Failed to Locate Dairy');
            return;
        }
        let stamp = (await plugin.rem.findByName(stampRichText, daily._id)) || (await plugin.rem.createRem());
        stamp?.setType(SetRemType.DESCRIPTOR);
        if (!stamp) {
            await plugin.app.toast('Failed to Create Stamp');
            return;
        }

        await stamp.setParent(daily);
        await stamp.setText(stampRichText);
        await stamp.addPowerup(TIME_TK_PW_CODE.TICK_PW);
        return stamp;
    }
    const createStampWithDate=async (date:Date|undefined)=>{
        date=date||new Date();
        let mo=moment(date);

        let stampText=`${mo.format("HH:mm")}`
        let stampRichText=await plugin.richText.text(stampText).value();
        let daily=await plugin.date.getDailyDoc(date);

        return await setupStampWithRichText(daily,stampRichText);
    }


    /**
     * get the  RemIds  "THE_DATE" property of a GTD item refers to.
     *
     * In ideal condition the RemIds this function returns should be the id of a Daily Document(please check this if necessary)
     * @param r the rem to query, tagged as a GTD item
     */
    async function getDateRemIdWithProperty(r:Rem) {

        return await getPropertyOfRemAsRem(r,dateHost._id) as Rem[]

        // //add DDL (Sometimes with Time tick) and informing Date into corresponding DailyDoc
        // let date=await r.getTagPropertyValue(dateHost._id);
        // // let dateDoc=(dailyDocPW ?  await plugin.search.search(date,dailyDocPW,{numResults:1}):  await plugin.search.search(date))[0]
        // return await plugin.richText.getRemIdsFromRichText(date);
    }
    /**
     * link gtd item "r" to the daily doc and time stamp the property "r.THE_DATE" and "r.TIME_TICK" specify.
     * @param r: the GTD item rem to link
     * @param link: the anchor link in the Daily doc pointing at "r". (optional input, will be a new portal containing "r" if left void)
     * @return the actual anchor link in daily doc as timestamp if "r.THE_DATE" exists.
     */
    const linkGTDItemToDairy=async (r:Rem,link?:Rem)=>{
        const dateRems=await getDateRemIdWithProperty(r);
        link = link || await createPortalFor(r);
        if(dateRems.length&&link)
        {
            const dateRem=dateRems[0]
            //get the "time tick" property
            let tick=await r.getTagPropertyValue(tickHost._id);
            //get the "time tick" rem
            let tickRemL=await plugin.richText.getRemIdsFromRichText(tick);


            //the var "stamp" has 3 types
            //1. if the GTD item "r" has no property "TimeTick", "stamp" will be the daily doc
            //2. if the "TimeTick" property of "r" is plain text, a new stamp tagged with "Time Tick" powerUp will be created, whose content will be the plain text
            //3. if the "TimeTick" property of "r" is a reference to another rem, "stamp" will be that rem.
            let stamp= await plugin.richText.length(tick) ?
                (tickRemL.length===0 ? await setupStampWithRichText(dateRem,tick): await plugin.rem.findOne(tickRemL[0]))
                : dateRem;


            if(stamp)
            {
                await link.setParent(stamp);

                // Time ticks add in the previous step need to be tagged with PW "TimeTick" and assign the property "TickType"
                // Change the property name "DDL" under "GTD Items" to "the DATE" and Add a property "DATE Type" with "Deadline/Warning/Informing/Log" to select

                if(await stamp.hasPowerup(TIME_TK_PW_CODE.TICK_PW))
                {
                    const timeLineType=await r.getTagPropertyValue(timeLineTypeHost._id);
                    const slotRem=await plugin.powerup.getPowerupSlotByCode(TIME_TK_PW_CODE.TICK_PW,await plugin.richText.toString(timeLineType));
                    if(slotRem)
                    {
                        const slotVal=await plugin.richText.rem(slotRem).value();
                        await stamp.setPowerupProperty(TIME_TK_PW_CODE.TICK_PW,TIME_TK_PW_CODE.TICK_SLOT,slotVal);
                    }
                }
            }
            return stamp

        }
    }
    //endregion


    //region Functions and variables to handle the "Owner Project" property

    /**
     * create a rem with specific content as a GTD item rem
     * @param text the content of the rem to create
     * @param itemType which type is this item? a rem representing a project or a scenario?
     * @return the created rem. But if text is blank, undefined will be returned
     */
    const createITEMWithRichText =async (text:RichTextInterface,itemType:string=ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Project) => {
        if(text.length===0)return
        const newRem=await createRemWithText(text)
        await getCollected(newRem,itemType)
        return newRem
        //todo: it is the work of next stage to introduce the "Natural Planning Model" functionality to the action tag "Project"
        // "Natural Planning Model" is a miniature of Project Management( WBS/schedule with DAG sort/resource regulation/... )
        /*const prjActionHost=await getHostRemOf((await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Project)) as Rem);
          await newRem.addTag(prjActionHost._id);
        * */
    }

    /**
     * the "getCollected" logic for rem with "Owner Project" property ( and mainly for rem with "treat as project" action)
     * @param r the rem to collect/contain
     * @param actionCode which container does "r" go?
     * @return a boolean value indicates whether "r" has been got collected by this function
     */
    const getCollectedWithOwnerPrj=async (r:Rem,actionCode:string=ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Project)=>{


        //get the rems of "r.OwnerProject" if this property exists.
        const ownerPropertyAsRem=await getPropertyOfRemAsRem(r,ownerPrjHost._id)
        //if the property value is text without rem references.
        if(!ownerPropertyAsRem||ownerPropertyAsRem.length===0)
        {
            //done : how about create a project with this property value?
            //Q: need to know whether "taggedRems" include indirect tagged Rems?
            //A: no problem, for there are special API named "ancestorTagRems" and "descendantTagRems"
            //Q: has other rems used the "tag channel"?
            //A: "not yet" can be asserted after checking the code.

            const newPrj= await createITEMWithRichText(await r.getTagPropertyValue(ownerPrjHost._id))
            if(!newPrj)
            {
                await getCollected(r,actionCode)
                return true
            }
            await r.setTagPropertyValue(ownerPrjHost._id,await plugin.richText.rem(newPrj).value())
            await r.setParent(newPrj._id)
            return true
        }
        //if there are references in the value of property
        else
        {
            //when owner Project is unique
            if(ownerPropertyAsRem.length===1)
            {
                const owner=ownerPropertyAsRem[0]
                await r.setParent(owner)
                await getCollected(await createReferenceFor(r) as Rem, actionCode)
                return false
            }
            //when this item belongs to multiple project.
            else{
                for(const owner of ownerPropertyAsRem)
                {
                    await createReferenceFor(r,owner)
                }
                await getCollected(r, actionCode)
                return true
            }
        }


    }

    const getContainedWithOwnerPrj=async (r:Rem,actionCode:string=ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Project)=>{
        return (await getCollectedWithOwnerPrj(r,actionCode))||(getCollected(r,actionCode))
    }

    //endregion

    //region Functions to handle the "Scenario" property

    /**
     * the logic to process rems with "r.Scenario" property
     * @param r
     * @return a boolean value indicating where the rem "r" has property "r.Scenario"
     */
    const getContainedWithScenario=async (r:Rem)=>{
        //DONE: Scenario may contains peoples to delegate...


        //get the rems of "r.Scenario" if this property exists.
        const scenarioAsRem=await getPropertyOfRemAsRem(r,sceneHost._id)
        //if the property value is text without rem references.
        if(!scenarioAsRem||scenarioAsRem.length === 0)
        {
            const newScenario=await createITEMWithRichText(await r.getTagPropertyValue(sceneHost._id))
            if(!newScenario)
            {
                // await getCollected(r,actionCode);
                return false;
            }
            await newScenario?.addTag(sceneHost)
            await r.setTagPropertyValue(sceneHost._id,await plugin.richText.rem(newScenario).value())
        }
        else
        //if there are references in the value of property
        {
            for(const scene of scenarioAsRem)
            {
                await scene.setParent(sceneHost._id)
                await scene.addTag(sceneHost)
            }

        }
        return true

    }
    //add listener for Scenario rems


    let sceneSet:Set<string>|null=null
    await plugin.event.addListener(AppEvents.RemChanged,sceneHost._id,async ()=>{
        if(!sceneSet)return
        sceneSet=new Set<string>((await sceneHost.getDescendants()).map(r=>r._id))
        //Note: a rem is representing a scenario only when it is a descendant of the "sceneHost"
        for(const scene of (await sceneHost.taggedRem()))
        {

            if(scene.parent===sceneHost._id){
                //todo maybe this "scene" is actually type of scenes?
                // answer: a scene classifier is not a scene but a rem whose parent is "sceneHost" and that does not tagged by "sceneHost".
            }
            if ( sceneSet.has(scene._id) ){
                continue
            }
            await scene.removeTag(sceneHost._id)
        }
    })
    //endregion

    //endregion



    //region Definitions of event listener handler implementing "Treat as" actions.

    const waitListHandler=async (r:Rem)=>{
        let dateDocL=await getDateRemIdWithProperty(r)

        // if specific time tick was not designated, place items into references of "Today" PowerUp at that DailyDoc
        // (Or left them in the DailyDoc directly?)

        if(dateDocL.length)
        {
            //remove the tag "GTD items"
            await r.removeTag(gtdHost._id)
            //move r into WAIT list
            await getContainedWithOwnerPrj(r,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Later)
            //create reference of "r" in Daily Doc
            let rRef=await createReferenceFor(r)
            await linkGTDItemToDairy(r,rRef)


        }
        else
        {
            await plugin.app.toast("A date as a tip needed if you want make it LATER to do")
        }
    }
    const awaitListHandler=async (r:Rem) =>{
        await getContainedWithOwnerPrj(r,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Delegate)

        //DONE if "scenario" does not exist, a toast is needed to inform the user.
        if(!await getContainedWithScenario(r))
        {
            await plugin.app.toast("Scenario needs to be specified when you wanna delegate it to someone")
        }
        // XXX : I cannot come up with a better idea in such a haste
        //portal the item into Daily Doc
        await linkGTDItemToDairy(r)
        //remove the tag "GTD items"
        await r.removeTag(gtdHost._id)

    }
    const projectListHandler=async (r:Rem) =>{
        // move item rem into project folder and remove the tag "GTD items"
        // await getCollected(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Project);
        await getCollectedWithOwnerPrj(r)

        await linkGTDItemToDairy(r)


        // create a rem named "next action" under the project and
        // tag "next action" with "GTD items"

        const next=await plugin.rem.createRem();
        if(next)
        {
            await next.setText(["Next Action"]);
            await next.setParent(r);
            await next.addTag(gtdHost);
        }
        //remove the tag "GTD items"
        await r.removeTag(gtdHost._id)
    }
    const refListHandler=async (r:Rem) =>{
        //move the item into the "REFERENCE/Successive Ones" folder
        //await getCollected(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Reference);
        //DONE (IMPORTANT) : what about the logic when "r" has property "r.OwnerProject"?
        //todo (partially done) how to get items contained when the items has other property?
        await getContainedWithOwnerPrj(r,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Reference)


        //remove the tag "GTD items"
        await r.removeTag(gtdHost._id)
    }
    const wasteListHandler = async (r:Rem) =>{
        await getCollected(r,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.WasteBin);
        //portal the item into Daily Doc
        await linkGTDItemToDairy(r);
        //remove the GTD tag and related properties
        await r.removeTag(gtdHost._id)
    }
    const wishesListHandler = async (r:Rem) =>{
        await getCollected(r,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.SomeDay);
        //move the item into Daily Doc
        await linkGTDItemToDairy(r);
        //remove the GTD tag and related properties

    }
    const nowListHandler = async (r:Rem)=>{
        await r.setIsTodo(true);
        await getCollectedWithOwnerPrj(r,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS.Now)
        plugin.event.addListener(AppEvents.RemChanged,r._id,async ()=>{
            if((await r.getTodoStatus())==="Finished")
            {
                //remove the tag "GTD items"
                await r.removeTag(gtdHost._id)
                plugin.event.removeListener(AppEvents.RemChanged,r._id);
            }
        })
    }
    //endregion

    //region Init event listeners

    /**
     * check whether a rem is tagged by the host
     * @param hostId the id of the specific host
     * @param r the rem to check
     */
    const isTaggedWithHost=async (hostId:string,r:Rem)=>{
        const tags=await r.getTagRems()
        for(const typeParent of tags)
        {
            if(hostId===typeParent._id)
                return true
        }
        return false
    }


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



    let gtdActionQueue=new Set()
    for(const actSlot of await treat_as_slot?.getChildrenRem())
    {
        const slotHostAsActOption=await getHostRemOf(actSlot)
        if(!slotHostAsActOption)
        {
            const slotText=actSlot.text && await plugin.richText.toString(actSlot.text)
            if(slotText)
            await plugin.app.toast(slotText+" is nowhere to be found...")
            return
        }

        //when ANY one host slot with this handler is changed, the handler will be triggered
        //then processing ALL the GTD items tagged with the "GTD Host"
        //so there may be "concurrent" conflicts between these handlers, which will duplicate the edits to Rems.
        //"handlerCaller" wraps the handlers to filter the duplicate edit
        const handlerCaller=async ()=>{

            if(slotHostAsActOption._id!==(await getHostRemOf(actSlot))._id)
            {
                await plugin.event.removeListener(AppEvents.RemChanged,slotHostAsActOption._id)
                return
            }
            let gtdItems=await gtdHost.taggedRem();
            for(const it of gtdItems)
            {
                if(gtdActionQueue.has(it._id))
                {
                   continue
                }
                else{
                    gtdActionQueue.add(it._id)
                }
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
                    if(handle&&await isTaggedWithHost(slotHostAsActOption._id,it)){
                        await plugin.event.removeListener(AppEvents.RemChanged,slotHostAsActOption._id)
                        await handle(it);
                        await plugin.event.addListener(AppEvents.RemChanged,slotHostAsActOption._id,handlerCaller)
                    }
                }
            }
            for(const it of gtdItems)
            {
                gtdActionQueue.delete(it._id)
            }

        }

        await plugin.event.addListener(AppEvents.RemChanged,slotHostAsActOption._id,handlerCaller)
    }


    //endregion

    return gtdHost && [gtdHost, await plugin.rem.createTable(gtdHost)];
}
