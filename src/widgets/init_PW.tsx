import {
    BuiltInPowerupCodes, PropertyLocation,
    PropertyType,
    ReactRNPlugin,
    SelectSourceType,
} from '@remnote/plugin-sdk';
import { GTD_PW_CODE, itemGtdName } from './consts';



const egtdName='engine_gtd';


export const init_PW = async (plugin: ReactRNPlugin) => {


    //region Init the TimeTick PW
    let tktyName = 'tkty';
    await plugin.app.toast("GTD Init phase 1.")



    await plugin.app.registerPowerup('Time Tick', 'time_tick', 'The powerUp to tag the time ticks, mainly used in DailyDocs', {
        slots: [{
            code: tktyName,
            name: 'TickType',
            onlyProgrammaticModifying: true,
            hidden: false,
            enumValues:{
                DEADLINE:"Deadline",
                WARNING:"Warning",
                INFO:"Informing",
                LOG:"LogTick"
            },
            defaultEnumValue:"LogTick"
        }]
    });

    //endregion

    const actOptions={
        WAIT:"Later",
        AWAIT:"Delegate",
        PRJ:"Project",
        WISH:"SomeDay",
        REF:"Reference",
        BIN:"WasteBin",
    }

    //region Setup the GTD PW
    let gtdSlots: any[][] = [
        [GTD_PW_CODE.DEADLINE, 'DDL',PropertyLocation.BELOW, PropertyType.DATE,undefined,undefined],
        [GTD_PW_CODE.TIME_TICK, 'TimeTick',PropertyLocation.ONLY_DOCUMENT, PropertyType.MULTI_SELECT,SelectSourceType.Relation,undefined],
        [GTD_PW_CODE.SCENARIO, 'scenario',PropertyLocation.BELOW , PropertyType.TEXT,undefined,undefined],
        [GTD_PW_CODE.INFORM_DATE, 'informDate',PropertyLocation.BELOW, PropertyType.DATE,undefined,undefined],
        [GTD_PW_CODE.OWNER_PROJECT, 'ownerProject',PropertyLocation.BELOW, PropertyType.SINGLE_SELECT,SelectSourceType.AnyRem,undefined],
        [GTD_PW_CODE.TREAT_AS, 'treatAs',PropertyLocation.RIGHT, PropertyType.SINGLE_SELECT,SelectSourceType.Enum,actOptions],
        [GTD_PW_CODE.MESSAGE, 'Msg.',PropertyLocation.ONLY_DOCUMENT, PropertyType.TEXT,undefined],
    ];

    // await plugin.app.registerPowerup('GTD Engine',egtdName,"the panel to use this GTD plugin",{
    //     slots:[]
    // })

    await plugin.app.registerPowerup('GTD Items', itemGtdName, 'powerUp fulfilling GTD workflow support', {
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
    const actionLogics=new Map()
    actionLogics.set(actOptions.BIN,async ()=>{
        let dairy=await plugin.date.getTodaysDoc()

    })


    let slot_acts=await plugin.powerup.getPowerupSlotByCode(itemGtdName,GTD_PW_CODE.TREAT_AS)
    let options=slot_acts && await slot_acts.getChildrenRem()
    if(options)
    {
        for(let op of options)
        {

        }
    }

    //endregion


    let sidebar = await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DocumentSidebar);
    let igtd=await plugin.powerup.getPowerupByCode(itemGtdName)
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

