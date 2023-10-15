import {
    BuiltInPowerupCodes, PropertyLocation,
    PropertyType,
    ReactRNPlugin,
    SelectSourceType,
} from '@remnote/plugin-sdk';
import { ACT_OPTIONS_LOGGER_PW_CODE, GTD_LOGGER_PW_CODE, TIME_TK_PW_CODE } from './consts';




export const init_PW = async (plugin: ReactRNPlugin) => {


    //region Init the TimeTick PW

    await plugin.app.registerPowerup('Time Tick', TIME_TK_PW_CODE.TICK_PW, 'The powerUp to tag the time ticks, mainly used in DailyDocs', {
        slots: [{
            code: TIME_TK_PW_CODE.TICK_SLOT,
            name: 'Tick Type',
            onlyProgrammaticModifying: true,
            hidden: false,
            enumValues:TIME_TK_PW_CODE.TICK_TYPE,
            defaultEnumValue:TIME_TK_PW_CODE.TICK_TYPE.LOG
        }]
    });

    //endregion



    //region set up the GTD LOGGER PW
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

    await plugin.app.registerPowerup('GTD Engine', GTD_LOGGER_PW_CODE.LOGGER_PW, 'powerUp fulfilling GTD workflow support', {
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
    //endregion

    //region register listener logics for actions
    // const actionLogics=new Map()
    // actionLogics.set(ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.BIN,async ()=>{
    //     let dairy=await plugin.date.getTodaysDoc()
    //
    // })

    const gtdBatchProcess=async ()=>{
        let igtd=await plugin.powerup.getPowerupByCode(GTD_LOGGER_PW_CODE.LOGGER_PW)
        if(!igtd)return;
        let items=await igtd.taggedRem()
        for (let item of items)
        {
            let actAs=await item.getPowerupPropertyAsRichText(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS)
            let actStr=await plugin.richText.toString(actAs);
            switch (actStr) {
                case ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.SomeDay:

                    break;
                case ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Later:
                    //add DDL (Sometimes with Time tick) and informing Date into corresponding DailyDoc

                    // if specific time tick was not designated, place items into references of "Today" PowerUp at that DailyDoc
                    // (Or left them in the DailyDoc directly?)

                    // if DDL not designated but Time tick designated, Time tick can belong to informing Date(if designated)

                    // Time ticks add in the descendent step need to be tagged with PW "TimeTick" and assign the property "TickType"
                    // Change the property name "DDL" under "GTD Items" to "the DATE" and Add a property "DATE Type" with "Deadline/Warning/Informing/Log" to select



                    break;
                case ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Delegate:
                    

                    break;
                case ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Project:
                    // move item rem into project folder and remove the tag "GTD items"

                    // create a rem named "next action" under the project and tagged it with Todo

                    // tag "next action" with "GTD items"
                    break;
                case ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.Reference:
                    //move the item into the "REFERENCE/Successive Ones" folder

                    //remove the tag "GTD items"

                    break;
                case ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS.WasteBin:
                    //move the item into Daily Doc

                    //remove the GTD tag

                    break;
            }
        }
    }

    let slot_acts=await plugin.powerup.getPowerupSlotByCode(GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS.TREAT_AS)
    let options=slot_acts && await slot_acts.getChildrenRem()
    if(options)
    {
        for(let op of options)
        {

        }
    }

    //endregion


    let sidebar = await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DocumentSidebar);
    let igtd=await plugin.powerup.getPowerupByCode(GTD_LOGGER_PW_CODE.LOGGER_PW)
    igtd?.setIsDocument(true);

    //region skip the step "Add GTD into sidebar" if it is not the first init.
    let igtdRefs=await igtd?.remsReferencingThis()
    if(igtdRefs)
    {
        for(let ref of igtdRefs)
        {
            let parentId=await ref.parent
            if(parentId===sidebar?._id)
                return
        }
    }
    //endregion

    await plugin.app.toast('It is the first init of GTD engine...');

    //region Add GTD into sidebar, with a reference to note that the first init has been done.
    let ref=await plugin.rem.createRem();
    igtd && ref?.setText(await plugin.richText.rem(igtd).value())
    sidebar && ref?.setParent(sidebar)


    let portal = await plugin.rem.createPortal();
    portal&& igtd && await igtd?.addToPortal(portal);
    sidebar &&  portal?.setParent(sidebar)

    //endregion

    await plugin.app.toast("GTD Init ready.")

};

