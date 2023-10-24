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
    ACT_OPTIONS_LOGGER_PW_CODE,
    GTD_HOST_PW,
    GTD_LOGGER_PW_CODE,
    HostCheckResult,
    HostType,
    PW2SLOTS,
    TIME_TK_PW_CODE, TTK_LOGGER_PW_CODE,
} from './consts';
import moment from 'moment';

let utils

export const init_PowerUps =async (plugin:ReactRNPlugin) => {

    const hostUniqueCheck=async (pw:Rem)=>{
        //const pw=await plugin.powerup.getPowerupByCode(pwCode)
        if(!pw)return HostCheckResult.PW_NOT_EXIST;
        let hostList=await pw.taggedRem()
        if(hostList&&hostList.length<=0)return HostCheckResult.HOST_NOT_EXIST
        if(hostList.length>1)return HostCheckResult.HOST_NOT_UNIQUE
        if(hostList.length===1)return HostCheckResult.HOST_UNIQUE
    }

    const hostUniqueRectify=async (pwCode:string,loggerCode:string)=>{
        const pw=await plugin.powerup.getPowerupByCode(pwCode);
        if(!pw)return
        let host
        const checkCode=await hostUniqueCheck(pw)
        switch (checkCode) {
            case HostCheckResult.PW_NOT_EXIST: return;
            case HostCheckResult.HOST_UNIQUE:
                host=(await pw.taggedRem())[0]
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
    const sidebar = await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DocumentSidebar);
    if(!sidebar) return
    const addToSidebar=async (r:Rem,portalLikeLink?:Rem|undefined,linkIsPortal?:boolean)=>{
        await r.setIsDocument(true)
        let tag= (!portalLikeLink)||!!linkIsPortal
        portalLikeLink= portalLikeLink || await plugin.rem.createPortal()
        if(sidebar&&portalLikeLink)
        {
            if(tag)
            await r.addToPortal(portalLikeLink)
            await portalLikeLink.setParent(sidebar)
        }

    }



    // a rem to show all the container rems of GTD engine
   await plugin.app.registerPowerup("GTD Containers Panel",ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE,
        "a rem to show all the container rems of GTD engine" ,{slots:[]})
   const gtdContainerInterface=await plugin.powerup.getPowerupByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_INTERFACE)


    if(gtdContainerInterface&&(!(await gtdContainerInterface.remsReferencingThis()).length|| (((await gtdContainerInterface.remsReferencingThis())[0].parent)!==sidebar?._id) ))
    {
        const gtdContainerInterfaceRef=await plugin.rem.createRem()
        if(gtdContainerInterfaceRef)
        {
            await gtdContainerInterfaceRef.setText(await plugin.richText.rem(gtdContainerInterface).value())
            await gtdContainerInterfaceRef.setParent(sidebar?._id)
            await addToSidebar(gtdContainerInterface)
        }
    }

    gtdContainerInterface?.setIsDocument(true)
    // gtdContainerInterface?.setText(["GTD Containers"])

    /**
     * Apply the properties of pwCode & slotCode to the host
     * @param host
     * @param pwCode the code of powerUp as the template of hosts
     * @param slotCode the PW slot code or option Rem as the tagger of the properties of the host
     * @param options
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
        await property?.setIsProperty(options===HostType.SLOT)

        return property
    }

    const genHostPropertiesWithLog =async (host:Rem,loggerCode:string) => {
        const logger=await plugin.powerup.getPowerupByCode(loggerCode);
        const slotCodesObj=PW2SLOTS.get(loggerCode)
        const slotCodesArr=slotCodesObj && Object.entries(slotCodesObj)
        if(!logger)return
        let slots=await logger.getChildrenRem()
        if(!slotCodesArr)return
        for(let slotCode of slotCodesArr)
        {
            await supplyHostPropertyVal(host,loggerCode,slotCode[1],HostType.SLOT)
        }
    }

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


    //region Init the TimeTick PW
    await plugin.app.registerPowerup('Time Tick', TIME_TK_PW_CODE.TICK_PW, 'The powerUp to tag the time ticks, mainly used in DailyDocs', {
        slots: [{
            code: TIME_TK_PW_CODE.TICK_SLOT,
            name: 'TickType',
            onlyProgrammaticModifying: true,
            hidden: false,
            enumValues:TIME_TK_PW_CODE.TICK_TYPE,
            defaultEnumValue:TIME_TK_PW_CODE.TICK_TYPE.LOG
        }]
    });
    //endregion

    //region Init the GTD Logger PW
    const gtd_logger_slot_list=Object.entries(GTD_LOGGER_PW_CODE.LOGGER_SLOTS)
    let gtdSlots: any[][] = [
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE, 'THE_DATE',PropertyLocation.BELOW, PropertyType.DATE,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK, 'TIME_TICK',PropertyLocation.ONLY_DOCUMENT, PropertyType.MULTI_SELECT,SelectSourceType.Relation,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.SCENARIO, 'SCENARIO',PropertyLocation.BELOW , PropertyType.TEXT,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIMELINE_TYPE, 'TIMELINE_TYPE',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.Enum,TIME_TK_PW_CODE.TICK_TYPE],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.OWNER_PROJECT, 'OWNER_PROJECT',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.AnyRem,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS, 'TREAT_AS',PropertyLocation.RIGHT, PropertyType.SINGLE_SELECT, SelectSourceType.Enum,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.MESSAGE, 'MESSAGE',PropertyLocation.ONLY_DOCUMENT, PropertyType.TEXT,undefined],
    ];
    await plugin.app.registerPowerup('GTD Engine', GTD_LOGGER_PW_CODE.LOGGER_PW,
        "A PowerUp marking up the properties under the host of the PowerUp tag 'GTD Engine Host' ", {
        slots: gtdSlots.map(slot => {
            return  {
                code: slot[0],
                name: slot[1],
                hidden: false,
                onlyProgrammaticModifying: false,
                propertyType: slot[3],
                propertyLocation:slot[2],
                selectSourceType:slot[4],
                enumValues:slot[5] //as Record<string,string>
            }
        }),
    });
    //endregion

    //region Init the Action Type Logger PW and Container PW
    const act_logger_slotCode_list=Object.entries(ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS)
    await plugin.app.registerPowerup("GTD Actions",ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,
        "A PowerUp marking up the option Rems of 'Treat As', handling related event listeners",
        {
            slots:act_logger_slotCode_list.map((r)=>{
                return{
                    code:r[1],
                    name:r[0],
                    hidden:false,
                    onlyProgrammaticModifying:true,
                }
            })
        })
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
    const gtd_host_pw=await plugin.powerup.getPowerupByCode(GTD_HOST_PW)
    const date_host_pw=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE)
    const tick_host_pw=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK)
    const tlkPW=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIMELINE_TYPE)
    // const waitLContainerPW=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Later)
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
    const acts_with_container=new Set([ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Delegate])

    //region Init GTD actions
    if(act_slot_host)
    {
        for(const act of act_logger_slotCode_list)
        {
            let option=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,act[1])
            if(!option)continue
            await supplyHostPropertyVal(act_slot_host,ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,act[1],HostType.OPTIONS)

            let container_slot=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,"c"+act[1])
            if(!(container_slot))continue;
            await supplyHostPropertyVal(act_slot_host,ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,"c"+act[1],HostType.CONTAINER)

        }
    }

    //endregion

    const timeLineTypeHost=await getHostRemOf(tlkPW)
    const gtdHost=await getHostRemOf(gtd_host_pw)
    const dateHost=await getHostRemOf(date_host_pw)
    const tickHost=await getHostRemOf(tick_host_pw)


    //region register options of TickType_Slot under the host
    const ttkTypeSlot=Object.entries(TIME_TK_PW_CODE.TICK_TYPE)
    const ttkTypeOptions=await tlkPW.getChildrenRem()
    for(const ttkTypeOpt of ttkTypeOptions)
    {
        await supplyHostPropertyVal(timeLineTypeHost,"",ttkTypeOpt,HostType.OPTIONS)
    }
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
    //endregion

    //region Init event listeners


    async function setupStamp(daily:Rem|undefined,stampRichText:RichTextInterface) {
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

    const createStamp=async (date:Date|undefined)=>{
        date=date||new Date();
        let mo=moment(date);

        let stampText=`${mo.format("HH:mm")}`
        let stampRichText=await plugin.richText.text(stampText).value();
        let daily=await plugin.date.getDailyDoc(date);

        return await setupStamp(daily,stampRichText);
    }


    const getContained = async (r:Rem,containerCode:string) => {
        const containerPW=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,containerCode);
        if(!containerPW)return;
        const container=await getHostRemOf(containerPW)
        container && await r.setParent(container);
    }

    const createPortalFor=async (r:Rem)=>{
        const portal=await plugin.rem.createPortal();
        if(!portal)return;
        await r.addToPortal(portal);
        return portal;
    }

    const getDailyDocIdWithProperty=async (r:Rem)=>{
        //add DDL (Sometimes with Time tick) and informing Date into corresponding DailyDoc
        let date=await r.getTagPropertyValue(dateHost._id);
        // let dateDoc=(dailyDocPW ?  await plugin.search.search(date,dailyDocPW,{numResults:1}):  await plugin.search.search(date))[0]
        return await plugin.richText.getRemIdsFromRichText(date);
    }

    const linkGTDItemToDairy=async (r:Rem,link?:Rem)=>{
        const dateIds=await getDailyDocIdWithProperty(r);
        link = link || await createPortalFor(r);
        if(dateIds.length&&link)
        {
            let tick=await r.getTagPropertyValue(tickHost._id);
            let tickRemL=await plugin.richText.getRemIdsFromRichText(tick);


            const dateRem=await plugin.rem.findOne(dateIds[0]);
            let stamp= await plugin.richText.length(tick) ?
                (tickRemL.length===0 ? await setupStamp(dateRem,tick): await plugin.rem.findOne(tickRemL[0]))
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

        }
    }

    const waitListHandler=async (r:Rem)=>{
        //move r into WAIT list
        await getContained(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Later)


        let dateDocL=await getDailyDocIdWithProperty(r)

        const rRefText= await plugin.richText.rem(r).value()
        let rRef=await plugin.rem.createRem()


        // if specific time tick was not designated, place items into references of "Today" PowerUp at that DailyDoc
        // (Or left them in the DailyDoc directly?)
        if(dateDocL.length)
        {

            await linkGTDItemToDairy(r,rRef)
            rRef?.setText(rRefText)
            //remove the tag "GTD items"
            await r.removeTag(gtdHost._id)
        }


      }
    const awaitListHandler=async (r:Rem) =>{
        await getContained(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Delegate)

        //todo: I cannot come up with a better idea in such a haste
        //portal the item into Daily Doc
        await linkGTDItemToDairy(r)

        //remove the tag "GTD items"
        await r.removeTag(gtdHost._id)

    }
    const projectListHandler=async (r:Rem) =>{
        // move item rem into project folder and remove the tag "GTD items"
        await getContained(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Project);


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
        await getContained(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.Reference);

        //remove the tag "GTD items"
        await r.removeTag(gtdHost._id)
    }
    const wasteListHandler = async (r:Rem) =>{
        await getContained(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.WasteBin);
        //portal the item into Daily Doc
        await linkGTDItemToDairy(r);
        //remove the GTD tag and related properties
        await r.removeTag(gtdHost._id)
    }
    const wishesListHandler = async (r:Rem) =>{
        await getContained(r,ACT_OPTIONS_LOGGER_PW_CODE.CONTAIN_SLOTS.SomeDay);
        //move the item into Daily Doc
        await linkGTDItemToDairy(r);
        //remove the GTD tag and related properties

    }
    const nowListHandler = async (r:Rem)=>{
        await r.setIsTodo(true);
        plugin.event.addListener(AppEvents.RemChanged,r._id,async ()=>{
            if((await r.getTodoStatus())==="Finished")
            {
                //remove the tag "GTD items"
                await r.removeTag(gtdHost._id)
                plugin.event.removeListener(AppEvents.RemChanged,r._id);
            }
        })
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


    for(const act of act_logger_slotCode_list)
    {
        const actSlot=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,act[1])
        if(!actSlot)continue;
        const actionHost=await getHostRemOf(actSlot)
        if(!actionHost)continue;

        await plugin.event.addListener(AppEvents.RemChanged,actSlot._id,async ()=>{
            let gtdItems=await gtdHost.taggedRem();
            for(const it of gtdItems)
            {
                const actVal=await  it.getTagPropertyValue(actionHost._id);
                //todo : the values of Option-type properties will be reference or just duplicate the text in RemNote's default routine?
                const actIds=await plugin.richText.getRemIdsFromRichText(actVal);
                if(!actIds.length)continue;
                if(actIds[0]===actionHost._id)
                {
                    const handle=handlerMap.get(act[0]);
                    (handle) && await handle(it);
                }
            }

        })
    }

    //endregion

    return gtdHost && [gtdHost, await plugin.rem.createTable(gtdHost)];
}