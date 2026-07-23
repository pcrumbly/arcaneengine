export const engineModules=[
  {route:'/',label:'Runtime',labelKey:'nav.runtime',module:'world',order:10},
  {route:'/world',label:'World',labelKey:'nav.world',module:'world',order:12},
  {route:'/character',label:'Operator',labelKey:'nav.operator',module:'characters',order:15},
  {route:'/quests',label:'Quests',labelKey:'nav.quests',module:'quests',order:20},
  {route:'/achievements',label:'Achievements',labelKey:'nav.achievements',module:'achievements',order:22},
  {route:'/journal',label:'Journal',labelKey:'nav.journal',module:'journal',order:25},
  {route:'/skills',label:'Skills',labelKey:'nav.skills',module:'skills',order:35},
  {route:'/combat',label:'Combat',labelKey:'nav.combat',module:'combat',order:50},
  {route:'/messages',label:'Messages',labelKey:'nav.messages',module:'messages',order:60},
  {route:'/studio',label:'Admin Console',labelKey:'nav.studio',module:'studio',order:90},
  {route:'/settings',label:'Settings',labelKey:'nav.settings',module:'settings',order:100},
  {route:'/account',label:'Account',labelKey:'nav.account',module:'account',order:110}
];
export const engineModuleRoutes=new Set(engineModules.map(item=>item.route));