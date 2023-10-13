import { eventCombo } from './consts';
import { ReactRNPlugin, Rem } from '@remnote/plugin-sdk';


//An event combo is a group of Rems whose RemChanged event were triggered due to the same user operation

let combo:eventCombo;
const ComboMap=Map<string,eventCombo>;


//three indexes for rems to find their event combo
let comboComplex=new Map(
    [
        ["src",new ComboMap()],
        ["ref",new ComboMap()],
        ["host",new ComboMap()]
    ]
)

const createCombo=(srcId:string|undefined,refId:string|undefined,hostId:string|undefined)=>{
    let combo=new eventCombo();
    combo.slotSrc=srcId;
    combo.slotRef=refId;
    combo.host=hostId;
    return combo
}


const id2Rem=async (remId:string|Rem,plugin:ReactRNPlugin)=>{
    // @ts-ignore
    return  typeof remId !== typeof ' ' ? remId : await plugin.rem.findOne(remId);
}

export const setRef=async (refId:string|Rem,plugin:ReactRNPlugin)=>{
    // @ts-ignore
    let refRem:Rem= await id2Rem(refId,plugin)

    if(!refRem)return
    let hostRem=refRem.parent || undefined;
    let combo=comboComplex.get("ref")?.get(refRem._id)
    if(combo)
    {
        combo.host=hostRem
        hostRem && comboComplex.get("host")?.set(hostRem,combo)
    }
}


export const setSrc=async (srcId:string|Rem,plugin:ReactRNPlugin)=>{
    // @ts-ignore
    let srcRem:Rem= await id2Rem(srcId,plugin)

}



export const getComboFrom=(idType:"src"|"ref"|"host",queryId:string)=>{
        let combo= (comboComplex.get(idType))?.get(queryId)
        let count=0;
        if(!combo)return;

        if(combo.host)count++;
        if(combo.slotRef)count++;
        if(combo.slotSrc)count++;

        if(count>1)return combo;
        else return undefined;

}



