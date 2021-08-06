/**
 * MGUI. Datagrid control
 * @module mgui_datagrid
 * @see ./mgui_base.js
 *
**/
/* jshint asi:true, -W100, forin:false, sub:true */
/* global mgui:false */



mgui.classes['datagrid']={
  schema:{
    '#width':{'type':'integer','data':199}
  },

  handlers:{
    'width':{
      'present':function(binding, attr, params){
        this.updateCategory('size')
      }
    }
  },

  methods:{
    'make':function(vmScopeStack, mScopeStack){
      mgui.log('EXECUTE: datagrid.make()','#80ff80')
      var self=this
      var schemaElId
      var schema=vmScopeStack.top.schemaNode
      self.htmlElement=document.createElement("div")
      if(!!self.parentNode.htmlElement){
        self.parentNode.htmlElement.appendChild(self.htmlElement)
      }
      self.updateCategory('all')
    }
  }
}
