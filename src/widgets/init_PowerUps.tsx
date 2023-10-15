import {
    AppEvents,
    BuiltInPowerupCodes,
    filterAsync, PropertyLocation, PropertyType,
    ReactRNPlugin,
    Rem,
    RichTextInterface, SelectSourceType,
    SetRemType,
} from '@remnote/plugin-sdk';
import {
    ACT_OPTIONS_LOGGER_PW_CODE,
    GTD_HOST_PW,
    GTD_LOGGER_PW_CODE,
    HostCheckResult,
    HostType,
    TIME_TK_PW_CODE,
} from './consts';
import moment from 'moment';

let utils

export const init_PowerUps =async (plugin:ReactRNPlugin) => {

    const hostUniqueCheck=async (pw:Rem)=>{
        //const pw=await plugin.powerup.getPowerupByCode(pwCode)
        if(!pw)return HostCheckResult.PW_NOT_EXIST;
        let hostList=await pw.taggedRem()
        if(!(hostList&&hostList.length<=0))return HostCheckResult.HOST_NOT_EXIST
        if(hostList.length>1)return HostCheckResult.HOST_NOT_UNIQUE
        if(hostList.length===1)return HostCheckResult.HOST_UNIQUE
    }

    const hostUniqueRectify=async (pw:Rem,loggerCode:string)=>{
        // const pw=await plugin.powerup.getPowerupByCode(pwCode);
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
                await genHostPropertiesWithLog(host,loggerCode)
                await host.addTag(pw._id)
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
                        await host.removeTag(pw._id)
                }
                await genHostPropertiesWithLog(earliestRem,loggerCode)
                break;
        }
    }
    const addToSidebar=async (r:Rem,portal?:Rem|undefined)=>{
        await r.setIsDocument(true)
        const sidebar = await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DocumentSidebar);
        portal= portal || await plugin.rem.createPortal()
        if(sidebar&&portal)
        {
            await r.addToPortal(portal)
            await portal.setParent(sidebar)
        }

    }

    const gtdPortal=await plugin.rem.createPortal()
    const gtdContainerInterface=await plugin.rem.createRem()
    gtdContainerInterface && !await gtdContainerInterface.isDocument() && await addToSidebar(gtdContainerInterface)
    gtdContainerInterface?.setIsDocument(true)
    gtdContainerInterface?.setText(["GTD Containers"])
    const supplyHostPropertyValue=async (host:Rem,slot:Rem,options:HostType)=>{
        const back=await slot.taggedRem()
        if(back&&back.length===1)
            return;
        if(back.length>1)
            for(let ba of back)
            {
                await ba.removeTag(slot._id)
            }
        const property = await plugin.rem.createRem();
        options===HostType.CONTAINER ? property && gtdContainerInterface && await property.setParent(gtdContainerInterface) : (await property?.setParent(host._id), await host.addTag(slot))
        slot.text &&  await property?.setText([await plugin.richText.toString(slot.text)]);
        await property?.setIsProperty(options===HostType.SLOT)



        return property
        //await slot.setBackText(await plugin.richText.rem(host).value())
    }

    const genHostPropertiesWithLog =async (host:Rem,loggerCode:string) => {
        const logger=await plugin.powerup.getPowerupByCode(loggerCode);
        if(!logger)return
        let slots=await logger.getChildrenRem()
        if(!slots)return
        for(let slot of slots)
        {
            await supplyHostPropertyValue(host,slot,HostType.SLOT)
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
        supplyHostPropertyValue:supplyHostPropertyValue,
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
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE, 'the DATE',PropertyLocation.BELOW, PropertyType.DATE,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK, 'TimeTick',PropertyLocation.ONLY_DOCUMENT, PropertyType.MULTI_SELECT,SelectSourceType.Relation,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.SCENARIO, 'scenario',PropertyLocation.BELOW , PropertyType.TEXT,undefined,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIMELINE_TYPE, 'Timeline Type',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.Enum,TIME_TK_PW_CODE.TICK_TYPE],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.OWNER_PROJECT, 'ownerProject',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.AnyRem,undefined],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS, 'treatAs',PropertyLocation.RIGHT, PropertyType.SINGLE_SELECT,SelectSourceType.Enum,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS],
        [GTD_LOGGER_PW_CODE.LOGGER_SLOTS.MESSAGE, 'Msg.',PropertyLocation.ONLY_DOCUMENT, PropertyType.TEXT,undefined],
    ];

    // await plugin.app.registerPowerup('GTD Engine',egtdName,"the panel to use this GTD plugin",{
    //     slots:[]
    // })

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
                enumValues:slot[5]
            }
        }),
    });


    // await plugin.app.registerPowerup("GTD Engine",GTD_LOGGER_PW_CODE.LOGGER_PW,
    //     "A PowerUp marking up the properties under the host of the PowerUp tag 'GTD Engine Host' "
    //     , {
    //         slots:gtd_logger_slot_list.map((r)=> {
    //             return {
    //                 code:r[1],
    //                 name:r[0],
    //                 hidden:true,
    //                 onlyProgrammaticModifying:true,
    //             }
    //         })
    //     })

    //endregion

    //region Init the Action Type Logger PW and Container PW
    const act_logger_slot_list=Object.entries(ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS)
    await plugin.app.registerPowerup("GTD Actions",ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,
        "A PowerUp marking up the option Rems of 'Treat As', handling related event listeners",
        {
            slots:act_logger_slot_list.map((r)=>{
                return{
                    code:r[1],
                    name:r[0],
                    hidden:true,
                    onlyProgrammaticModifying:true,
                }
            })
        })
    await plugin.app.registerPowerup("GTD Act Containers",ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,
        "A PowerUp marking up the receiver Rems of 'Treat As', containing Rems marshalled by decisions made with GTD",
        {
            slots:act_logger_slot_list.map((r)=>{
                return{
                    code:"c"+r[1],
                    name:r[0],
                    hidden:true,
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
    const date_host_pw=await plugin.powerup.getPowerupByCode(GTD_LOGGER_PW_CODE.LOGGER_SLOTS.THE_DATE)
    const tick_host_pw=await plugin.powerup.getPowerupByCode(GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TIME_TICK)

    // region Init GTD host

    if(!gtd_host_pw||!date_host_pw||!tick_host_pw)return
    await hostUniqueRectify(gtd_host_pw,GTD_LOGGER_PW_CODE.LOGGER_PW)
    // endregion

    //region Init GTD actions
    const treat_as_slot=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS)
    const act_host=treat_as_slot&& await getHostRemOf(treat_as_slot)
    const acts_with_container=new Set([ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Delegate])
    if(act_host)
    {
        for(const act of act_logger_slot_list)
        {
            let slot=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,act[1])
            if(!slot)continue
            const p=await supplyHostPropertyValue(act_host,slot,HostType.OPTIONS)

            let container_slot=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,"c"+act[1])
            if(!(p&&container_slot))continue;
            await supplyHostPropertyValue(act_host,container_slot,HostType.CONTAINER)
        }
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
    const ttkPW=await plugin.powerup.getPowerupByCode(TIME_TK_PW_CODE.TICK_PW)


    const gtdHost=await getHostRemOf(gtd_host_pw)
    const dateHost=await getHostRemOf(date_host_pw)
    const tickHost=await getHostRemOf(tick_host_pw)
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
        await stamp.addPowerup(TIME_TK_PW_CODE.TICK_PW)
        return stamp;
    }

    const createStamp=async (date:Date|undefined)=>{
        date=date||new Date();
        let mo=moment(date);

        let stampText=`${mo.format("HH:mm")}`
        let stampRichText=await plugin.richText.text(stampText).value()

        let daily=await plugin.date.getDailyDoc(date);



        return await setupStamp(daily,stampRichText);
    }

    const remText2Date=async (r:RichTextInterface)=>{
        const dateText=await plugin.richText.toString(r)

    }

    const dailyDocPW=await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DailyDocument)

    const waitListHandler=async (r:Rem)=>{
        //add DDL (Sometimes with Time tick) and informing Date into corresponding DailyDoc
        let date=await r.getTagPropertyValue(dateHost._id)
        // let dateDoc=(dailyDocPW ?  await plugin.search.search(date,dailyDocPW,{numResults:1}):  await plugin.search.search(date))[0]
        let dateDocL=await plugin.richText.getRemIdsFromRichText(date)

        // if specific time tick was not designated, place items into references of "Today" PowerUp at that DailyDoc
        // (Or left them in the DailyDoc directly?)
        let tick=await r.getTagPropertyValue(tickHost._id)
        let tickRemL=await plugin.richText.getRemIdsFromRichText(tick)
        if(dateDocL.length)
        {
            const dateDoc=await plugin.rem.findOne(dateDocL[0])
            let stamp= await plugin.richText.length(tick) ?
                (tickRemL.length===0 ? await setupStamp(dateDoc,tick): await plugin.rem.findOne(tickRemL[0]))
                : dateDoc

            if(stamp)
            {
                const rRefText= await plugin.richText.rem(r).value()
                let rRef=await plugin.rem.createRem()
                if(rRef)
                {
                    await rRef.setText(rRefText)
                    await rRef.setParent(stamp)
                }
                if(await stamp.hasPowerup(TIME_TK_PW_CODE.TICK_PW))
                {

                }
            }


        }


        // Time ticks add in the previous step need to be tagged with PW "TimeTick" and assign the property "TickType"
        // Change the property name "DDL" under "GTD Items" to "the DATE" and Add a property "DATE Type" with "Deadline/Warning/Informing/Log" to select
    }
    const awaitListHandler=() =>{
        //todo: I cannot come up with a better idea in such a haste

        //move the item into Daily Doc

        //remove the GTD tag, but "scenario" property left

    }

    const projectListHandler=()=>{
        // move item rem into project folder and remove the tag "GTD items"

        // create a rem named "next action" under the project and tagged it with Todo

        // tag "next action" with "GTD items"
    }
    const refListHandler=()=>{
        //move the item into the "REFERENCE/Successive Ones" folder

        //remove the tag "GTD items"
    }
    const wasteListHandler = () => {
        //move the item into Daily Doc

        //remove the GTD tag and related properties

    }


    for(const act of act_logger_slot_list)
    {
        const actSlot=await plugin.powerup.getPowerupSlotByCode(ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,act[1])
        if(!actSlot)continue;
        const actHost=await getHostRemOf(actSlot)
        if(!actHost)continue;
        await plugin.event.addListener(AppEvents.RemChanged,actHost._id,()=>{

        })
    }

    //endregion




    return gtdHost && [gtdHost, await plugin.rem.createTable(gtdHost)]
}

export const utilFunc=utils