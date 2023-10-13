import {
    BuiltInPowerupCodes,
    PropertyType,
    ReactRNPlugin,
    SelectSourceType,
} from '@remnote/plugin-sdk';
import { GTD_PW_CODE } from './consts';


const itemGtdName = 'item_gtd';
const egtdName='engine_gtd';


export const init_PW = async (plugin: ReactRNPlugin) => {


    const init_common_process=async ()=>{
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

        //region Init the GTD PW
        let gtdSlots: any[][] = [
            [GTD_PW_CODE.DEADLINE, 'DDL', PropertyType.DATE],
            [GTD_PW_CODE.TIME_TICK, 'TimeTick', PropertyType.MULTI_SELECT],
            [GTD_PW_CODE.SCENARIO, 'scenario', PropertyType.TEXT],
            [GTD_PW_CODE.INFORM_DATE, 'informDate', PropertyType.DATE],
            [GTD_PW_CODE.OWNER_PROJECT, 'ownerProject', PropertyType.SINGLE_SELECT,SelectSourceType.AnyRem],
            [GTD_PW_CODE.TREAT_AS, 'treatAs', PropertyType.SINGLE_SELECT,SelectSourceType.Enum],
            [GTD_PW_CODE.MESSAGE, 'Msg.', PropertyType.TEXT],
        ];

        // await plugin.app.registerPowerup('GTD Engine',egtdName,"the panel to use this GTD plugin",{
        //     slots:[]
        // })

        await plugin.app.registerPowerup('GTD Item', itemGtdName, 'powerUp fulfilling GTD workflow support', {
            slots: gtdSlots.map(slot => {
                return slot.length>3 ? {
                    code: slot[0],
                    name: slot[1],
                    hidden: false,
                    onlyProgrammaticModifying: true,
                    propertyType: slot[2],
                    selectSourceType:slot[3]
                } :{
                    code: slot[0],
                    name: slot[1],
                    hidden: false,
                    onlyProgrammaticModifying: true,
                    propertyType: slot[2],
                };
            }),
        });
        //endregion

        let igtd=await plugin.powerup.getPowerupByCode(itemGtdName)
        igtd?.setIsDocument(true);

    }


    // try {
    //
    //     //let igtd=await plugin.powerup.getPowerupByCode(itemGtdName)
    //     await init_common_process()
    // }
    // catch (e) {
    //     console.warn(e);
    //
    //
    // }



    await init_common_process()
    let sidebar = await plugin.powerup.getPowerupByCode(BuiltInPowerupCodes.DocumentSidebar);
    let igtd=await plugin.powerup.getPowerupByCode(itemGtdName)

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

