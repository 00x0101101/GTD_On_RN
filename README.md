# GTD on RemNote

## a plugin to make it smoother to use GTD on RN.

## ⚠ Note:
1. this plugin hasn't been published to the RemNote Plugin Marketplace yet for it  have just been constructed and is under alpha testing on my own device.

## Introduction

This chapter supposes you have know the workflow of GTD. 
- If you don't, there are lots of tutorials in YouTube or BiliBili.

After Setting up the plugin, a rem named `GTD Container Panel` is shown in the sidebar.

![](https://github.com/00x0101101/GTD_On_RN/blob/main/public/toturials/Quicker_20231108_160425.png?raw=true)

Expand the "DRAFT"  you can find that there are 2 documents created: `Host` and `GTD Container Panel` 
- `GTD Container Panel` is unique but duplicated here for one is shown as Draft, another is shown directly by a portal in the sidebar

![](https://github.com/00x0101101/GTD_On_RN/blob/main/public/toturials/Quicker_20231108_162741.png?raw=true)

The `Host` looks like this:

![](https://github.com/00x0101101/GTD_On_RN/blob/main/public/toturials/Quicker_20231108_172332.png?raw=true)

These properties are corresponding to the GTD workflow.

## Configurations on properties of the hosts

For limited API, you needed to configure some properties of `Host` manually at your first usage.

Properties need to be configured are shown below with their configuration accordingly.
- after setting up the type and source type of the two properties `TIME_TYPE` and `TREAT_AS`, options to these properties should be loaded automatically. 
![](https://github.com/00x0101101/GTD_On_RN/blob/main/public/toturials/Quicker_20231108_174742.png)

If you have already set some rem with similar functions, you can change the name of these properties to that same with those legacy rem  and merge them by click the "merge" button in the right.
and the name of `Host`  is also editable. 



## Usage

After determining the date, owner GTD item and scenario of a GTD item( or leaving them in blank), you can choose the options in "TREAT_AS" property.
The GTD item will be processed automatically and moved to corresponding Container in the `GTD Container Panel` and/or Daily Document if its property `THE_DATE` is specified.



## Properties in the `HOST`

1. `THE_DATE` appoints the date to process the item, or the date when you need to get reminded by the item.
2. `TIME_TICK` works with `THE_DATE`, referring to the concrete time tick in the day `THE_DATE` specified.
3. `SCENARIO` specifies the scenarios (e.g. person(s) to delegate, environment & spot requirement(s) ) the item will depends on.
4. `OWNER_ITEM` indicates the owner(s) of this item. The item is a part of the Owner(s).
5. `TIMELINE_TYPE` is the level of  `THE_DATE` & `TIME_TICK`. Obviously it denotes the priority of the item.
6. `MESSAGE` contains other messages that you need to show in the right/bottom of the item.
7. `TREAT_AS` assigns the type of the item. Once this property has been set, specific actions will be triggered.

## Options of `TREAT_AS` property and their corresponding actions

There are 6 options for a GTD items, became enumerations under `TREAT_AS` property.

After the value of its property `TREAT_AS` is set or modified, by default, all the items will 
1. (be collected or linked by container or owner): the items will be moved to be a child of corresponding container of the option (aka. be collected into the container) or a child of the `OWNER_ITEM` if this property value exists (aka. be collected by its owner), or create a reference as a child(aka. be linked by container or owner)
   - BY DEFAULT, if both `THE_DATE` and `OWNER_ITEM` is specified in one item, the item will collected by its owner and be linked to dailyDoc of `THE_DATE`
   - BY DEFAULT, if there are multiple owners, the item will be collected by corresponding container and be linked to all the owners
2. (be linked to dailyDoc of `THE_DATE`): the items will leave a portal or reference under the dailyDoc `THE_DATE` specified (if property value exists) ,or under one child representing a specific moment of the `THE_DATE` in that dailyDoc.
3. (be forgotten by the `HOST`): the items will remove the tag `HOST` and be removed from the table view. 


Besides the default actions, each of options have its specific action on the items once the `TREAT_AS` value has be set to that option. 

These specific actions have higher priority than the default actions( can be understood as an `override & polymorphism` relationship )

These options are listed below, with its default name and the action it exerts to its item. 

1.  When an item is "treated_as" a **Reference**, item will be collected and/or linked IN THE DEFAULT WAY.
2.  When an item is "treated_as" an item for **Someday** inaccurate, item will
    - Link to a dailyDoc `THE_DATE` specifies. if `THE_DATE` has not been specified, its property `TIMELINE_TYPE` will be added into the practice queue as a reminder.
    - Its property `OWNER_ITEM` will be ignored by actions of this option, the item will be only collect to corresponding container `GTD Container Panel\SomeDay`
3.  When an item is "treated_as" an item to **Delegate** to others
    - The property `SCENARIO` indicating the assignee(s) of this item will be collected into `GTD Container Panel\SECNARIO` for future usage. 
    - Then the item will be linked to the DailyDoc of `THE_DATE` (If exists)
4.  When an item is "treated_as" a **Project**, it will
    - get collected or linked by its owner IN THE DEFAULT WAY as a subproject(if value of `OWENER_ITEM` exist)
    - a new GTD item named `Next Action of [[r]]`  will be created whose owner is this `Project` item.
    - all valid direct children of a **Project** will become GTD items. A valid children of **Project** should be neither a Finished Todo nor something like a portal/tableView/property/etc. 
5.  When an item is "treated_as" an item to be done **Later**, it will be collected and linked IN THE DEFAULT WAY *ONLY WHEN* value of `THE_DATE` is specified.
6.  When an item needs to be done for **Now**
    - the item will be collected or linked IN THE DEFAULT WAY
    - its tag `Host` won't be removed like other treatments do. the rem will be tagged as a todo.
7.  When an item is "treated_as" what needs to be in the **WasteBin**
    - The item will be linked to dailyDoc `THE_DATE` specified. 
    - Then the property-value pair `TREAT_AS:: wastebin` will be added into the practice queue as a reminder
    - The proficiency of this card can give you a reference to decide whether to delete this item in the `WasteBin`

//you can think it as an interactive Notion template. 🙂


## ROADMAP
- [ ] Introduce "Natural Planning Model" into **Project** items.
    
- [ ] Wait for RN plugin team to support the Enum type of PowerUps not only in APIs.

![](https://github.com/00x0101101/GTD_On_RN/blob/main/public/toturials/Quicker_20231113_211711.png)

![](https://github.com/00x0101101/GTD_On_RN/blob/main/public/toturials/Quicker_20231113_211959.png)


- [ ] (not sure yet) Interaction and/or Integration with [The-Three-Body-Theme](https://github.com/Ekuboh/The-Three-Body-Theme) 
    