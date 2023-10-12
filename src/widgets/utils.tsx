import { filterAsync, Rem } from '@remnote/plugin-sdk';


const getAllPropOf=async (tagRem:Rem|undefined)=>{
  let children= await tagRem?.getChildrenRem()
  return children && await filterAsync(children,c=>c.isProperty())
}


