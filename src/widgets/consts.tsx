import {
  PropertyLocation,
  PropertyType,
  Rem,
  RichTextInterface,
  SelectSourceType,
} from '@remnote/plugin-sdk';

const GTD_LOGGER_CODE={
  TIME_TICK:"ttk",
  THE_DATE: "gdat",
  SCENARIO:"scn",
  TIMELINE_TYPE:"gttk",
  OWNER_ITEM:"goprj",
  TREAT_AS:"gact",
  MESSAGE:"gmsg",
  DISABLED:"gdab"
}
export const GTD_LOGGER_PW_CODE={
  LOGGER_PW:"engine_gtd",
  LOGGER_SLOTS:GTD_LOGGER_CODE
}

export const GTD_ACTIVE_PW={
  PW:"act_gtd_item"
}


const actOptions={
  Later:"_wait",
  Delegate:"_await",
  Project:"_prj",
  SomeDay:"_wish",
  Reference:"_ref",
  WasteBin:"_bin",
  Now:"_now"
}
const actContainerSlots={
  Later:"c_wait",
  Delegate:"c_await",
  Project:"c_prj",
  SomeDay:"c_wish",
  Reference:"c_ref",
  WasteBin:"c_bin",
  Now:"c_now"

}

export type aspect_containers={
  SCENARIO: string
}

let aspects:aspect_containers={
  SCENARIO: 'g_scene'
};

export const ACT_OPTIONS_LOGGER_PW_CODE={
  ACT_PW:"gacto",
  CONTAINER_PW:"gactc",
  //the powerUp code whose owner tags the "Container Panel" in the Sidebar.
  CONTAINER_INTERFACE:"gactc_i",
  ACT_SLOTS:actOptions,
  ACT_CONTAINER_SLOTS:actContainerSlots,
  ASPECT_CONTAINERS:aspects,
  ASPECT_OPTIONS:{
    SCENARIO:[PropertyLocation.BELOW,PropertyType.TEXT,SelectSourceType.Enum,
      {
        Person:"Person",
        Site:"Site",
      }
    ]
  } as { [key in keyof aspect_containers]:any[] }
}

const tickType={
  DEADLINE:"Deadline",
  WARNING:"Warning",
  INFO:"Informing",
  LOG:"LogTick"
}
export const TIME_TK_PW_CODE =  {
  //power code representing for "Time Tick" to tag time stamps.
  TICK_PW:"time_tick",
  TICK_SLOT:"tkty",
  TICK_TYPE:tickType
}



// mapping type
// see [code example](https://www.typescriptlang.org/play?#code/FASwdgLgpgTgZgQwMZQAQDUEBsCuUDOqqA3sEUQgFyr4QzgDmZ5ARtWDgLYuzNEDaAaygBParXpgGAXWo4wgsAHsA7mGABfYMAgiADmgAKqALyphIpXAzY8+HfrQAVUzdwF+AcgSfpDg6gAyq6Y7vheLL7acPJIECBKYKgg+ADSovgAFBZyCspqAJTUFsmExqTkqDBQEDgwSSUmTajenqgAPu3moqbNnpGa0bHxiagMNaF4ADzpIqhQAB7QYAAmZQB82aLUs0VudvyzfjFgcQlJ4xCTUFtiNHSMe-KKqkkV5EiJtPdK1dTXhDM70qFGoACIABJQLBYJRggA0fBBbFQAEYAEwAZkRlS0SJA1kyKVmWQsBQKJCRlWqtXqP2qQlEflx2mpNTqSVovygjJEfjxAHoBagkKV7pImJ8wN9RWZLtdMq0CsAhagVmKONxeFLvuq5RNbDd+p5laqlBAABawQgpVDPfLqHUQeaueWGzJgmJIQSoS1oFS-LArMEFIA)
// or  [explanation in Chinese](https://www.zhihu.com/question/463682477)
export interface RemPropertyTypes{
  Rem:Rem[],
  RemId:string[],
  RichTextElementInterface:RichTextInterface
}
export type RemPropertyType=keyof RemPropertyTypes
export const isRemPropertyType=(key:unknown) : key is RemPropertyType =>{
  return key==="Rem"||key==="RemId"||key==="RichTextElementInterface"
}

export class eventCombo{
  slotSrc:string|undefined;
  slotRef:string|undefined;
  host:string|undefined
}

/**
 *
 */
export enum HostCheckResult {


  INVALID_4_SRC_NOT_EXIST=-1,// property value is void.


  NOT_UNIQUE=3,// there are multiple rems being referenced by this property.


  NOT_EXIST=2,// property value is text without reference(s) to any rems.


  UNIQUE=1 // property value has referenced only one rem.
}

export const OwnerState = HostCheckResult

export enum HostType{
  PROPERTY = 1,
  OPTIONS = 2,
  CONTAINER = 3

}
export const GTD_HOST_PW="host_gtd"

export const PW2SLOTS=new Map<string,Object>([
    [GTD_LOGGER_PW_CODE.LOGGER_PW,GTD_LOGGER_PW_CODE.LOGGER_SLOTS],
    [ACT_OPTIONS_LOGGER_PW_CODE.ACT_PW,ACT_OPTIONS_LOGGER_PW_CODE.ACT_SLOTS],
    [ACT_OPTIONS_LOGGER_PW_CODE.CONTAINER_PW,ACT_OPTIONS_LOGGER_PW_CODE.ACT_CONTAINER_SLOTS]
])