/**
 * MGUI. Datagrid control
 * @module mgui_area
 * @requires ./mgui_base.js
 *
**/
/* jshint asi:true, -W100, forin:false, sub:true */
/* global mgui:false
 *
 * @callback mgui.HandlerCallback
 * @param
 * */


mgui.classes['area'] = {
  schema: {
    '#width':{type:'number',data:100},
    //    '#height':50,
    //'#text':'Base class has no text in',
    '#css': 'smallTextArea' // {'type':'string',data:'smallTextArea'}
  },
  updatingCategories: [
    'editmode', 'css', 'text','size'
  ],

  handlers: {
    'css': {
      'present': function(binding, attr, params) {
        this.updateCategory('css')
      }
    },
    
    'width':{
      'validate':function(binding, attr,params) {
        mgui.log("!!! area.text.width.validate "+params.newData,'yellow')
        if(params.newData<200) {
          mgui.log("reset width to "+200)
          return [mgui.C.US_VALIDATE_CORRECTED,200,mgui.C.T_NUMBER]
        }
      },
      'present': function(binding, attr, params) {
          this.updateCategory('size')
        }
      },
    // validate(data from publishers) -> evaluate(validated data) -> present (validated evaluated data)
    'text': {
      'validate': function(binding, attr, params) {
        console.log("area.text.handler.validate ", binding, params)
      },
      'evaluate': function(binding, attr, params) {
        console.log("area.text.handler.evaluate", params, this, attr)
      },
      'present': function(binding, attr, params) {
        this.updateCategory('text')
      }
    }
  },

  methods: {
    'create': function(vmScopeStack, mScopeStack) {
      mgui.log('EXECUTE: area.make()', '#80ff80')
      var self = this
      self.htmlElement = document.createElement("div")
      self.infoElement = document.createElement("div")
      if (!!self.parentNode.htmlElement) {
        self.parentNode.htmlElement.appendChild(self.htmlElement)
        self.parentNode.htmlElement.appendChild(self.infoElement)
      }
      self.updateCategory('all')
    },

    'textentered': function() {
      var self = this,
        oldText, r,
        attr = self['#']['text'],
        newText = self.htmlElement.textContent,
        linkage = self['#']['text'].linkage

      if ('old' in attr) {
        oldText = attr['old']
        if (oldText === newText)
          return
        delete attr['old']
      }
      // возвращает r[0]=true/false r[1]-результат вызова _changeItself
      r = mgui.emit(linkage['pubPath'], linkage['pubAttrName'], mgui.C.EV_CHANGE, {
        newData: newText,
        newDataType: mgui.C.T_STRING,
        caller: self.path + '#text'
      })
      if (!!r[0]) {
        if (r[1][0] === mgui.C.US_VALIDATE_ERROR) {
          self.infoElement.textContent = r[1][1]
          self.infoShown = true
        } else if (r[1][0] === mgui.C.US_VALIDATE_CORRECTED) {
          self.htmlElement.textContent = r[1][1]
          if (!!self.infoShown) {
            self.infoElement.textContent = ''
            self.infoShown = false
          }
        } else {
          if (!!self.infoShown) {
            self.infoElement.textContent = ''
            self.infoShown = false
          }
        }
      }
    },

    'update': function() {
      function _onKeyPress(e) {
        var linkage, pubDataAttr, pubType
        if (e.keyCode < 32) {
          e.preventDefault();
          return false
        }
        if (self['#']['text'].linkage) {
          linkage = self['#']['text'].linkage
          if ('bindPubDataNode' in linkage) {
            pubDataAttr = linkage['bindPubDataAttr']
            pubType = ('type' in pubDataAttr) ? pubDataAttr['type'] : mgui.C.T_STRING
            switch (pubType) {
              case mgui.C.T_NUMBER:
                if (!!e.key.match(badNum)) {
                  e.preventDefault();
                  return false
                }
                break
              case mgui.C.T_DATE:
                if ((e.key !== mgui.lang.base['DATE_SEPARATOR']) && (!!e.key.match(badInt))) {
                  e.preventDefault();
                  return false
                }
                break
              case mgui.C.T_INT:
                if (!!e.key.match(badInt)) {
                  e.preventDefault();
                  return false
                }
                break
            }
          }
        }


        if (!('old' in self['#']['text'])) {
          self['#']['text']['old'] = self.htmlElement.textContent
        }
        //self.doLater('textentered')
      }

      function _onFocus(e) {
        mgui.log('Focus')
      }

      function _onBlur(e) {
        mgui.log('Blur')
      }

      function _onChange(e) {
        self.doLater('textentered')
      }

      function _onPaste(e) {
        var n, range, anyrange, sel, oldText, newText, r,
        linkage = self['#']['text'].linkage,
          i, pasteText
        sel = window.getSelection()
        n = sel.rangeCount
        for (i = 0; i < n; i++) {
          anyrange = sel.getRangeAt(i)
          if (anyrange.commonAncestorContainer.parentNode === self.htmlElement) {
            range = anyrange
            break
          }
        }
        if (range === undefined) return false
        pasteText = e.clipboardData.getData('text/plain')
        oldText = self.htmlElement.textContent
        newText = [oldText.slice(0, range.startOffset), pasteText, oldText.slice(range.endOffset)].join('')
        // caller - маркируем себя как вызывающего цепочку обновлений, чтобы обновление ко мне не вернулось
        r = mgui.emit(linkage['pubPath'], linkage['pubAttrName'], mgui.C.EV_CHANGE, {
          newData: newText,
          newDataType: mgui.C.T_STRING,
          caller: self.path + '#text'
        })
        if ((r[0] === false) || (r[1][0] === mgui.C.US_VALIDATE_ERROR)) {
          e.preventDefault();
          return false
        }
        if (r[1][0] === mgui.C.US_VALIDATE_CORRECTED) {
          self.htmlElement.textContent = r[1][1]
          e.preventDefault();
          return false
        }
      }
     
      var self = this,
        badNum = new RegExp("[^0-9" +
          mgui.lang.base['DECIMAL_SEPARATOR'] +
          mgui.lang.base['THOUSANDS_SEPARATOR'] + "]+", 'g'),
        badInt = new RegExp("[^0-9]+", 'g')

      mgui.log('EXECUTE METHOD: mgui.area("' + self.path + '").refresh()', '#80ff80')
      if (self.checkoutCategory ('editmode')) {
        if (this.getAttributeAsString('editable') === 'true') {
          if (!self.editMode) {
            self.htmlElement.addEventListener('focus', _onFocus, true)
            self.htmlElement.addEventListener('blur', _onBlur, true)
            self.htmlElement.addEventListener('blur', _onChange, true)
            self.htmlElement.addEventListener('keypress', _onKeyPress, true)
            self.htmlElement.addEventListener('paste', _onPaste, true)
            self.htmlElement.contentEditable = 'true'
          }
          self.editMode = true
        } else {
          if (!!self.editMode) {
            self.htmlElement
            self.htmlElement.contentEditable = 'false'
          }
          self.editMode = false
        }
      }
      if (self.checkoutCategory('css')) {
        self.htmlElement.className = this.getAttributeAsString('css')
      }
      if (self.checkoutCategory('text')){
        self.htmlElement.innerText = this.getAttributeAsString('text')
      }
      if (self.checkoutCategory('size')){
        self.htmlElement.style.width= this.getAttributeAsString('width')
      }
      self.resetUpdateCategories()
    }
  }
}

mgui.classes['textarea'] = {
  'schema': {
    '#nodeClass': 'area'
  },
  'methods': {
    'make': function(vmScopeStack, mScopeStack, parentNode) {
      mgui.log('---Вызaваю билдер area.make()')
      this.callInherited('make', [vmScopeStack, mScopeStack, parentNode])
      mgui.log('---Вызван textArea.make()')
    }
  }
}
