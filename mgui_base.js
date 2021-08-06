/**
 * Mobile GUI library
 * @module mgui
 *
 * jshint asi:true, -W100, forin:false, sub:true
 */
/** @namespace */
var mgui = {
  lang: { DATE_SEPARATOR: '.' },
  actions: [],
  interval: 0,
  pageControls: {},
  guiContainer: 0,
  history: [],
  msgQueue: [],
  msgQueueIds: {},
  msgQueueInterval: 0,
  taskQueueInterval: 0,
  taskList: {},
  taskListSize: 0,
  taskDoneCallbacks: [],
  bindery: { byPub: { '#': 0 }, bySub: { '#': 0 } },
  datasources: {},
  model: undefined,
  schema: {},
  classes: {},
  nextUID: 1,
  reExtractPath: /^([a-zA-Z0-9_\/]*)((#(\w*))?)/
}

mgui.C={
  EV_CHANGE: 'change',
  EV_UPDATE: 'update',
  EV_PULL: 'pull',
  EVT_INSERTITEM: 'INSERTITEM',
  EVT_DELITEM: 'DELITEM',
  EVT_APPENDITEM: 'APPENDITEM',
  NT_DATASET: '[DATASET]',
  NT_SUBCOLUMNS: '[SUBCOLUMNS]',
  NT_COLUMN: '[COLUMN]',
  BT_AUTO: 'BT_AUTO',
  BT_FORMULA: 'BT_FORMULA',
  BT_NONE: 'BT_NONE',
  BT_BIND_IN: 'BT_BINDIN',
  BT_BIND_INOUT: 'BT_BIND_INOUT',
  T_INT: 'T_INT',
  T_VARIANT: 'T_VARIANT',
  T_STRING: 'T_STRING',
  T_NUMBER: 'T_NUMBER',
  T_TUPLE: 'T_TUPLE',
  T_UNDEFINED: 'T_UNDEFINED',
  T_BINDREF: 'T_BINDREF',
  T_DATE: 'T_DATE',
  US_VALIDATING: 'VALIDATING',
  US_VALIDATED: 'VALIDATED',
  US_VALIDATE_ERROR: 'VALIDATE_ERROR',
  US_VALIDATE_CORRECTED: 'VALIDATE_CORRECTED',
  US_EVALUATING: 'EVALUATING',
  US_EVALUATE_ERROR: 'EVALUATE ERROR',
  US_PRESENTING: 'PRESENTING',
  US_PRESENTED: 'PRESENTED',
  US_PRESENT_ERROR: 'PRESENT_ERROR',
  US_PULLED: 'PULLED',
  CR_GOOD: 1,
  CR_ERROR: 2,
  CR_CORRECTED: 3, // convert results
  US_INPUT: 'INPT',
  CC_NONE: 0,
  CC_UNKNOWN: 1,
  CC_QUOTE: 2,
  CC_OPERATORCHAR: 3,
  CC_OPERATOR: 4,
  CC_SPACE: 5,
  CC_SYMBOL: 6,
  CC_TEXT: 7,
  CC_EOT: 8,
  CC_BIND: 9,
  CC_NUMBER: 10,
  E_SYMBOL: 'SYM',
  E_BIND: 'BND',
  E_TEXT: 'TXT',
  E_NUMBER: 'NUM',
  E_OPERATOR: 'OPE',
  E_OPENFUNC: 'OFN',
  E_OPENEVAL: 'OEV',
  E_CALLFUNC: 'FN',
  defaultRowsPerPage: 10
}

mgui.C.TYPE_MAP = {
  'int': mgui.C.T_INT,
  'string': mgui.C.T_STRING,
  'number': mgui.C.T_NUMBER,
  'date': mgui.C.T_DATE,
  'formula': mgui.C.BT_FORMULA,
  'bindIn': mgui.C.BT_BIND_IN,
  'bindInOut': mgui.C.BT_BIND_INOUT
}

mgui.lang = {
  base: {
    THOUSANDS_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.',
    DATE_SEPARATOR: '.',
    TIME_SEPARATOR: ':',
    DATE_FORMAT_SHORT: 'd/m/y',
    DATE_FORMAT_LONG: 'd/M/Y',
    SHORT_MONTHS: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    ERROR_BAD_NUMBER: 'Некорректное число',
    ERROR_UNKNOWN_DATE_SRCTYPE: 'Неподдерживаемый тип данных из которого требуется получить дату',
    ERROR_UNKNOWN_NUMBER_SRCTYPE: 'Неподдерживаемый тип данных из которого требуется получить число',
    ERROR_BAD_DATE: 'Некорректная дата',
    ERROR_BAD_DATE_NUM: 'В дате указываются только цифры',
    ERROR_NOT_DATE: 'Значение не является датой'
  }
}



/**
 * Класс узла данных
 * @constructor
 * @param {string} path путь к узлу
 * @param {mgui.DataNode} parentNode родительский узел
 */
mgui.DataNode = function(path, parentNode) {
  var s=this
  s.path = path
  s.parentNode = parentNode
  s['#'] = {} // в этом месте netbeans тупит и говорит, что нет такой глобальной переменной как this 
}
/** @deprecated  НЕ ТЕСТИРОВАЛОСЬ
 *
 **/
mgui.DataNode.prototype.callInherited = function(methodName, ars) {
  try {
    var generalClass = this['#']['class']['data']
    if (methodName in generalClass['methods']) {
      return generalClass['methods'][methodName].apply(this, ars)
    }
  } catch (e) {}
}

mgui.DataNode.prototype.doLater = function(methodName, params) {
  var self = this
  if ((!!self.path) && (methodName in self.methods))
    mgui.doLaterOnce(self.path + '!' + methodName, self, self.methods[methodName], params)
}

mgui.DataNode.prototype.updateCategory = function(categoryName) {
  var self = this
  if (!self.updatingCategories)
    self.updatingCategories = {}
  self.updatingCategories[categoryName] = 1
  self.doLater('update')
}

mgui.DataNode.prototype.checkoutCategory = function(categoryName) {
  var self = this
  if('all' in self.updatingCategories){
    if(categoryName in self.updatingCategories)
      delete self.updatingCategories[categoryName]
    return true
  }
  if(categoryName in self.updatingCategories){
    delete self.updatingCategories[categoryName]
    return true
  } else
    return false
}
mgui.DataNode.prototype.resetUpdateCategories = function() {
  this.updatingCategories={}
}

mgui.DataNode.prototype.getAttributeAsString = function(attrName, defaultResult) {
  var d, format, r, t
  if (attrName in this['#']) {
    var attr = this['#'][attrName]
    if ('data' in attr){
      t = attr['type'] || mgui.C.T_STRING
      d = attr['data']
      format = attr['format']
    }
    if (d !== undefined){
      r = mgui.convert(t, d, mgui.C.T_STRING, format)
      if (r[0] === mgui.C.CR_GOOD)
        return r[1]
    }
  }
  return defaultResult
}

mgui.DataNode.prototype.getAttributeAsNumber = function(attrName, failResult) {
  if (attrName in this['#']) {
    var attr = this['#'][attrName]
    if ('data' in attr)
      var r, t = attr['type'],
        d = attr['data']
    if (d === undefined)
      return failResult
    else {
      r = mgui.convert(t, d, mgui.C.T_NUMBER, format)
      if (r[0] === mgui.C.CR_GOOD)
        return r[1]
      else
        mgui.error('getAttributeAsNumber is failed [' + attrName + '] ' + r[2])
      return failResult
    }
  }
  return failResult
}

/**
 * @param string path путь к узлу
 */
mgui.getDataNode = function(scopeStack, path) {
  var r, popOnExit = 0
  if ((path !== '') && (path !== '.')) {
    r = mgui.openPath(path, false, scopeStack)
    if (r[0] === false) return r
    popOnExit = 1
  }
  var dataNode = scopeStack.top.dataNode
  if (popOnExit) mgui.closePath(scopeStack)
  return [dataNode.type, dataNode.value]
}



/**
 * Устанавливает значение атрибута вместе с дополнительными параметрами
 * @param {string} attrName название устанавливаемого атрибута
 * @param {Object} options опции функции
 * @param {string=} options.type строковое описание типа данных int,string,number
 * @param {string=} options.data данные
 * @param {string=} options.dataType внутренний тип данных mgui.C.T_xxxx
 * @param {boolean=} options.nullable атрибут допускает пустое значение
 * @param {string=} options.bindType тип связки
 * @param {boolean=} options.doCreateRefNodes создавать узлы, на которые указывает связь. По-умолчанию true
 * @param {mgui.DataNode=} options.contextScopeStack область контекста данных на которые указывают ссылки по-умолчанию
 * @param {object=} options.handlers обработчики событий
 *
 **/

mgui.DataNode.prototype.setAttribute = function(attrName, options) {
  if (options === undefined)
    options = {}
  var thisAttr, attrExpression, res, r, n, s, schemaAttrName, params,
    expressionRPN, bindParams, i, pubPath, pubAttrName, sNode, binding, isChanged = 0,
    // Путь к данному атрибуту узла
    thisScopeAttrPath = this.path + '#' + attrName,
    // По-умолчанию, создаем все связанные формулами узлы
    doCreateRefNodes = (options.doCreateRefNodes === undefined) ? true : options.doCreateRefNodes,
    newData, hasNewData = 0,
    typeName, newDataType = options['dataType'],
    bindType = options['bindType'],
    // стек контекстной области видимости
    contextScopeStack = options.contextScopeStack

  if ('data' in options) {
    newData = options['data']
    hasNewData = 1
  }

  if ('type' in options) {
    typeName = options['type']
    if (typeName in mgui.C.TYPE_MAP) {
      newDataType = mgui.C.TYPE_MAP[typeName]
    } else
      newDataType = mgui.C.T_VARIANT
  }

  if (attrName in this['#']) {
    thisAttr = this['#'][attrName]
  } else {
    thisAttr = this['#'][attrName] = {}
    if (!newDataType)
      newDataType = thisAttr.type = mgui.C.T_VARIANT
  }

  if (hasNewData) {
    // ЕСЛИ новый тип связи данных автоматически определяемый, то определяем его из строки newdata
    if ((bindType === mgui.C.BT_AUTO) || ((bindType === undefined) && (typeof newData === 'string'))) {
      if ((newData.charAt(0) === '{') && (newData.substr(-1) === '}')) {
        if (newData.charAt(1) === '=') {
          bindType = mgui.C.BT_FORMULA
        } else {
          bindType = mgui.C.BT_BIND_INOUT
        }
      } else {
        bindType = mgui.C.BT_NONE
      }
    }
  }

  switch (bindType) {
    case mgui.C.BT_FORMULA:
      attrExpression = newData.substring(2, newData.length - 1)
      res = mgui.parseExpression(attrExpression)
      if (res[0] === true) {
        expressionRPN = res[1]
        bindParams = res[2]
        // linkage - прямая связь с атрибутами которые публикуют часть 
        // параметров для вычисляемого формулой выражения 
        thisAttr.linkage = {
          expressionRPN: expressionRPN,
          bindParams: bindParams,
          bindPubDataNodes: [],
          formula: attrExpression
        }
        for (i in bindParams) {
          pubPath = bindParams[i]
          // По-умолчанию, если атрибут издателя не указан, то  атрибутом отправителем является #value
          // {/env/clock/localDate} означает {/env/clock/localDateYMD#value}
          // Но этот способ нежелателен, так как создает неявное действие
          pubAttrName = 'defaultValue'
          if (pubPath.indexOf('#') >= 0) {
            r = pubPath.split('#')
            pubPath = r[0]
            pubAttrName = r[1]
          }

          r = mgui.openPath(pubPath, doCreateRefNodes, contextScopeStack)
          if (r[0] === false) return r
          n = contextScopeStack.top.dataNode
          if (!('#' in n)) {
            if (!doCreateRefNodes) return [false, 'Узел ' + pubPath + ' не содержит атрибутов']
            n['#'] = {}
          }
          if (!(pubAttrName in n['#'])) {
            if (!doCreateRefNodes) return [false, 'Узел ' + pubPath + ' не содержит атрибута ' + pubAttrName]
            r = n['#'][pubAttrName] = { 'data': '' }
            s = contextScopeStack.top.schemaNode
            // но! если есть схема данных на данный узел, то подтягиваем из него все определения
            if (!!s) {
              schemaAttrName = '#' + pubAttrName
              if (schemaAttrName in s) {
                sNode = s[schemaAttrName]
                if ('data' in sNode) r['data'] = sNode['data']
                if ('type' in sNode) r['type'] = sNode['type']
              }
            }
          } else r = n['#'][pubAttrName]

          // Сначала подписываемся на наличие изменений в параметрах выражения
          thisAttr.linkage.bindPubDataNodes[i] = r
          binding = mgui.subscribe(pubPath + '#' + pubAttrName, mgui.C.EV_CHANGE,
            thisScopeAttrPath + '$' + i, _changeEvaluatedBind)
          binding.paramNo = i
          //            binding.pubDataNode=contextScopeStack.top.dataNode
          binding.subDataNode = this
          binding.pubDataNode = n
          if (!!options.handlers)
            binding.handlers = options.handlers
          mgui.closePath(contextScopeStack)

          binding = mgui.subscribe(thisScopeAttrPath, mgui.C.EV_PULL, thisScopeAttrPath, _pullEvaluatedBind)
          binding.subDataNode = this
          // Затем подписываемся на вычисление общего результата выражения
          // и его публикацию сами к себе
          binding = mgui.subscribe(thisScopeAttrPath, mgui.C.EV_UPDATE, thisScopeAttrPath, _updateEvaluatedBind)
          //  binding.pubDataNode=thisScope.dataNode
          binding.subDataNode = this
          if (!!options.handlers)
            binding.handlers = options.handlers
        } // for each bindParams
        mgui.emit(this.path, attrName, mgui.C.EV_PULL)
      } else {
        mgui.error(res[1])
        return [false, res[1]]
      }
      break

    case mgui.C.BT_BIND_INOUT:
      // Если формулы нет, а есть прямой биндинг к атрибуту узла в модели
      // по адресу названия узла {pubPath} или {pubPath#anyAttr}
      attrExpression = newData.substring(1, newData.length - 1)
      pubPath = attrExpression
      if ((i = pubPath.indexOf('#')) >= 0) {
        pubAttrName = pubPath.substring(i + 1)
        pubPath = pubPath.substring(0, i)
      } else
        pubAttrName = 'value'
      r = mgui.openPath(pubPath, doCreateRefNodes, contextScopeStack)
      if (r[0] === false) return r
      n = contextScopeStack.top.dataNode
      if (!(pubAttrName in n['#'])) {
        if (!doCreateRefNodes) return [false, 'Узел ' + pubPath + ' не содержит атрибута ' + pubAttrName]
        r = n['#'][pubAttrName] = { 'data': '' }
        s = contextScopeStack.top.schemaNode
        if (!!s) {
          schemaAttrName = '#' + pubAttrName
          if (schemaAttrName in s) {
            sNode = s[schemaAttrName]
            if ('data' in sNode) r['data'] = sNode['data']
            if ('type' in sNode) r['type'] = sNode['type']
          }
        }
      } else {
        r = n['#'][pubAttrName]
      }
      thisAttr.linkage = {
        pubPath: pubPath,
        pubAttrName: pubAttrName,
        bindPubDataAttr: r,
        bindPubDataNode: n
      }
      binding = mgui.subscribe(pubPath + '#' + pubAttrName, mgui.C.EV_CHANGE, thisScopeAttrPath, _changeDirectBind)
      binding.subDataNode = this
      binding.pubDataNode = n
      if (!!options.handlers)
        binding.handlers = options.handlers
      mgui.closePath(contextScopeStack)

      binding = mgui.subscribe(thisScopeAttrPath, mgui.C.EV_UPDATE, thisScopeAttrPath, _updateDirectBind)
      binding.subDataNode = this
      if (!!options.handlers)
        binding.handlers = options.handlers

      binding = mgui.subscribe(thisScopeAttrPath, mgui.C.EV_PULL, thisScopeAttrPath, _pullDirectBind)
      binding.subDataNode = this
      if (!!options.handlers)
        binding.handlers = options.handlers
      mgui.emit(this.path, attrName, mgui.C.EV_PULL) // сначала вытягиваем данные из источников
      break

    default: //no bind, change itself
      binding = this['#'][attrName]['changeBinding']
      if (!binding) {
        this['#'][attrName]['changeBinding'] = binding = mgui.subscribe(thisScopeAttrPath, mgui.C.EV_CHANGE, thisScopeAttrPath, _changeItself)
        binding.subDataNode = this
      }
      if (!!options.handlers)
        binding.handlers = options.handlers

      binding = this['#'][attrName]['updateBinding']
      if (!binding) {
        this['#'][attrName]['updateBinding'] = binding = mgui.subscribe(thisScopeAttrPath, mgui.C.EV_UPDATE, thisScopeAttrPath, _updateItself)
        binding.subDataNode = this
      }
      if (!!options.handlers)
        binding.handlers = options.handlers
      params = {}
      if (newDataType !== undefined) {
        if (thisAttr['type'] !== newDataType)
          params.newDataType = newDataType, isChanged = 1
      }
      if (thisAttr['data'] !== newData)
        params.newData = newData, isChanged = 1
      if (options.nullable !== undefined) {
        if (thisAttr['nullable'] !== options.nullable)
          thisAttr['nullable'] = options.nullable, isChanged = 1
      }
      if (isChanged)
        return mgui.emit(this.path, attrName, mgui.C.EV_CHANGE, params)
      else
        return [false, 'Данные совпадают со старыми. Изменения не производятся']
  } // switch of bindType


  // params здесь не используется, поскольку новые данные вычисляются
  function _changeEvaluatedBind(params) {
    var r, c, binding = this,
      thisDataNode = binding.subDataNode,
      paramIndex, paramIndexPos,
      thisAttr, subAttrName = binding.subPathAttr

    if (!params) params = {}
    paramIndexPos = subAttrName.indexOf('$')
    if (paramIndexPos > 0)
      paramIndex = subAttrName.substring(paramIndexPos + 1),
      subAttrName = subAttrName.substring(0, paramIndexPos)
    thisAttr = thisDataNode['#'][subAttrName]
    if ((!!binding.handlers) && (!!(c = binding.handlers['validate']))) {
      thisAttr.state = mgui.C.US_VALIDATING
      r = c.call(thisDataNode, binding, thisAttr)
      if (r === false) {
        thisAttr.state = mgui.C.US_VALIDATE_ERROR
        thisAttr.error = params.error
        mgui.error("При вычисляемом изменении " + binding.subPathAttr + " ошибка:" + params.error)
        return
      }
    }
    thisAttr.state = mgui.C.US_VALIDATED
    mgui.postEmit(binding.subPathNode, subAttrName, mgui.C.EV_UPDATE)
  }

  function _pullEvaluatedBind() {
    mgui.postEmit(this.subPathNode, this.subPathAttr, mgui.C.EV_UPDATE)
  }

  function _updateEvaluatedBind() {
    var binding = this,
      thisDataNode = binding.subDataNode,
      i, ne, cmd, arg, stack = [],
      c, r,
      thisAttr = thisDataNode['#'][binding.subPathAttr],
      params = {}
    for (i in thisAttr.linkage.expressionRPN) {
      ne = thisAttr.linkage.expressionRPN[i]
      cmd = ne[0]
      arg = ne[1]
      r = mgui.expressionElementHandlers[cmd](arg, stack, thisAttr.linkage)
      if ((r !== undefined) && (r[0] === false)) {
        mgui.error(r[1] + ' in ' + ne[2])
      }
    }
    if (stack.length === 1) {
      r = mgui.convert(stack[0][0], stack[0][1], thisAttr.type)
      if (r[0] === mgui.C.CR_ERROR) {
        thisAttr['state'] = mgui.C.US_EVALUATE_ERROR
        thisAttr['error'] = r[2]
        mgui.error("При вычисляемом обновлении " + binding.subPathAttr + " ошибка:" + r[2])
        return
      }
      params.newData = r[1]

      if ((!!binding.handlers) && (!!(c = binding.handlers['evaluate']))) {
        thisAttr['state'] = mgui.C.US_EVALUATING
        r = c.call(thisDataNode, binding, thisAttr, params)
        if (r === false) {
          thisAttr['state'] = mgui.C.US_EVALUATE_ERROR
          thisAttr['error'] = params.error
          mgui.error("При вычисляемом обновлении " + binding.subPathAttr + " ошибка:" + params.error)
          return
        }
      }
      // ЗАПИСЫВАЕМ НОВОЕ ВЫЧИСЛЕННОЕ ЗНАЧЕНИЕ!
      thisAttr['data'] = params.newData
    } else {
      thisAttr['state'] = mgui.C.US_EVALUATE_ERROR
      thisAttr['error'] = "Формула содержит ошибки. В стеке осталось " + stack.length + " значений. Формула:" + thisAttr.linkage.formula
      mgui.error(thisAttr.error)
      return
    }

    if ((!!binding.handlers) && (!!(c = binding.handlers['present']))) {
      thisAttr['state'] = mgui.C.US_PRESENTING
      r = c.call(thisDataNode, binding, thisAttr, params)
      if (r === false) {
        thisAttr['state'] = mgui.C.US_PRESENT_ERROR
        thisAttr['error'] = params.error
        return
      }
    }
    thisAttr['state'] = mgui.C.US_PRESENTED
  }

  function _changeDirectBind(params) {
    var r, c, binding = this,
      thisDataNode = binding.subDataNode,
      thisAttr = thisDataNode['#'][binding.subPathAttr]
    if (!params) params = {}
    if (params.newData === undefined) {
      r = mgui.convert(thisAttr.linkage.bindPubDataAttr['type'],
        thisAttr.linkage.bindPubDataAttr['data'],
        thisAttr['type'])
      if (r[0] === mgui.C.CR_ERROR) {
        thisAttr['state'] = mgui.C.US_VALIDATE_ERROR
        thisAttr['error'] = r[2]
        return
      }
      params.newData = r[1]
    }
    
    if ((!!binding.handlers) && (!!(c = binding.handlers['validate']))) {
     
      thisAttr['state'] = mgui.C.US_VALIDATING
      
      // TODO!   Не сходятся результаты вызова в direct и itself
      //  вроде поправил с телефона
      
       
      r = c.call(thisDataNode, binding, thisAttr, params)
      if (r[0] == mgui.C.US_VALIDATE_ERROR){
        thisAttr['state'] = mgui.C.US_VALIDATE_ERROR
        thisAttr['error'] = "get error from r"
        return
      }
      
      if (r[0] == mgui.C.US_VALIDATE_CORRECTED) {
        thisAttr['data'] = r[1]
        if (!!r[2]) thisAttr['type'] = r[2]
       }
      
      if (r === undefined) {
        thisAttr['state'] = mgui.C.US_VALIDATE_ERROR
        thisAttr['error'] = params.error
        return
      } 
    }
    
    thisAttr['state'] = mgui.C.US_VALIDATED
    if (params.newData !== undefined)
      thisAttr['data'] = params.newData
    if (params.newDataType !== undefined)
      thisAttr['type'] = params.newDataType
    mgui.postEmit(binding.subPathNode, binding.subPathAttr, mgui.C.EV_UPDATE)
  
  }

  // Вытянуть данные из источниов прямого связывания. Используется при начальной
  // инициализации атрибута, связанного с каким-то другим атрибутом
  function _pullDirectBind(params) {
    var pubAttrRef, binding = this,
      subPathAttr = binding.subPathAttr,
      thisDataNode = binding.subDataNode,
      expr = thisDataNode['#'][subPathAttr].linkage,
      pubDataNode = expr.bindPubDataNode,
      pubAttrName = expr.pubAttrName

    if (('#' in pubDataNode) && (pubAttrName in pubDataNode['#'])) {
      pubAttrRef = pubDataNode['#'][pubAttrName]
      if ('data' in pubAttrRef) {
        thisAttr['data'] = pubAttrRef['data']
        thisAttr['type'] = pubAttrRef['type']
        thisAttr['state'] = mgui.C.US_PULLED
      }
    }
    mgui.postEmit(binding.subPathNode, binding.subPathAttr, mgui.C.EV_UPDATE)
  }

  // params не должен ничего содержать! Данные уже должны быть записаны в модель
  function _updateDirectBind(params) {
    var binding = this,
      r, c, thisDataNode = binding.subDataNode,
      thisAttr = thisDataNode['#'][binding.pubPathAttr]
    thisAttr['state'] = mgui.C.US_EVALUATING
    if ((!!binding.handlers) && (!!(c = binding.handlers['evaluate']))) {
      r = c.call(thisDataNode, binding, thisAttr, params)
      if (r === false) {
        thisAttr['state'] = mgui.C.US_EVALUATE_ERROR
        thisAttr['error'] = params.error
        return
      }
    }
    // обновляем данные!
    //thisAttr['data']=params.newData

    if ((!!binding.handlers) && (!!(c = binding.handlers['present']))) {
      thisAttr['state'] = mgui.C.US_PRESENTING
      r = c.call(thisDataNode, binding, thisAttr, params)
      if (r === false) {
        thisAttr['state'] = mgui.C.US_PRESENT_ERROR
        thisAttr['error'] = params.error
        return
      }
    }
    thisAttr['state'] = mgui.C.US_PRESENTED
  }

  /**
   * Вызывается через подписку на данные EV_CHANGE целевого узла
   * @param {string} params.newData новые данные
   * @param {string} params.newDataType тип новых данных
   * @return [enum UpdateState, any newData] .0-тип результата обработки изменения состояния, .1-измененное значение или ошибка
   */
  function _changeItself(params) {
    var r, r2, c, binding = this,
      thisDataNode = binding.subDataNode,
      thisAttr = thisDataNode['#'][binding.pubPathAttr],
      targetDataType = thisAttr['type']

    mgui.log('_changeItself[' + binding.subPath + ' (' + thisAttr['type'] + ')' + thisAttr['data'] +
      ' <= (' + params.newDataType + ')' + params.newData + ']')

    if (targetDataType === undefined) {
      thisAttr['type'] = (params.newDataType === undefined) ? mgui.C.T_VARIANT : params.newDataType
    }

    if (params.newData !== undefined) {
      if (params.newDataType === undefined)
        params.newDataType = targetDataType
      r2 = mgui.convert(params.newDataType, params.newData, targetDataType, thisAttr) // r2[0]=status, r2[1]-convValue. r2[2]-errorMessage
      params.newDataType = targetDataType
      switch (r2[0]) {
        case mgui.C.CR_GOOD:
          params.newData = r2[1];
          break
        case mgui.C.CR_ERROR:
          return [mgui.C.US_VALIDATE_ERROR, r2[2] ]; // возвращаем ошибку
        case mgui.C.CR_CORRECTED:
          params.newData = r2[1] // в данные записываем расчищенную версию данных
          r=[mgui.C.US_VALIDATE_CORRECTED, r2[1] ] // возвращаем измененную версию
          break
      }
    }

    if ((!!binding.handlers) && (!!(c = binding.handlers['validate']))) {
      thisAttr['state'] = mgui.C.US_VALIDATING
      // при вызове handler возвращает [результат, новое_значение, новый тип]
      r = c.call(thisDataNode, binding, thisAttr, params)
      if (r == undefined) {
        thisAttr['data']=params.newData
        r = [mgui.C.US_VALIDATED]
      }
      if (r[0] == mgui.C.US_VALIDATE_CORRECTED) {
        thisAttr['data'] = r[1] // значение изменено
        if (!!r[2]) 
          thisAttr['type'] = r[2]
      }
    } else {
      r = [mgui.C.US_VALIDATED]
      thisAttr['data']=params.newData
    }

    thisAttr['state'] = r[0]
    mgui.postEmit(binding.subPathNode, binding.subPathAttr, mgui.C.EV_UPDATE)
    return r
  }

  function _updateItself(params) {
    var r, c, binding = this,
      thisDataNode = binding.subDataNode,
      thisAttr = thisDataNode['#'][binding.pubPathAttr]

    if ((!!binding.handlers) && (!!(c = binding.handlers['present']))) {
      thisAttr['state'] = mgui.C.US_PRESENTING
      r = c.call(thisDataNode, binding, thisAttr, params)
      if (r === false) {
        thisAttr['state'] = mgui.C.US_PRESENT_ERROR
        thisAttr['error'] = params.error
      }
    }
  }
}
/*
mgui.DataNode.prototype.applySchema=function(schema,scopeStack,contextScopeStack){
      // extern vars: digScopeStack, contextScopeStack
    var dataNode=this,
      tAttrName, tAttrDefs, tBindType, tcAttrName, tDataType, tAttrData,
      nodeClassName = schema['#nodeClass'],
      handlers = {},
      nodeClass = undefined
    if (!('#' in dataNode))
      dataNode['#'] = {}
    if (!!nodeClassName) {
      if (typeof nodeClassName == 'object')
        nodeClassName = nodeClassName['data']
      if (nodeClassName in mgui.classes)
        nodeClass = mgui.classes[nodeClassName]
      if ('schema' in nodeClass)
        dataNode.applySchema(nodeClass['schema'],scopeStack,contextScopeStack)
    }
    for (tAttrName in schema) {
      if (tAttrName.indexOf('#') === 0) {
        tAttrDefs = schema[tAttrName]
        // название атрибута без # в начале
        tcAttrName = tAttrName.substr(1)
        if ((!!nodeClass) && ('handlers' in nodeClass) && (tcAttrName in nodeClass['handlers'])) {
          handlers = mgui.copyObject(nodeClass['handlers'][tcAttrName])
        }
        if (typeof tAttrDefs == 'object') {
          tBindType = tAttrDefs['bind']
          if (tBindType !== undefined)
            tBindType = (tBindType in mgui.C.TYPE_MAP) ? mgui.C.TYPE_MAP[tBindType] : mgui.C.BT_AUTO
          mgui.setAttribute(scopeStack, tcAttrName, {
            'data': tAttrDefs['data'],
            'nullable': tAttrDefs['nullable'],
            'bindType': tBindType,
            'type': tAttrDefs['type'],
            'contextScopeStack': contextScopeStack,
            'handlers': handlers
          })
        } else {
          tBindType = mgui.C.BT_AUTO
          tAttrData = tAttrDefs
          mgui.setAttribute(scopeStack, tcAttrName, {
            'data': tAttrData,
            'type': typeof tAttrData,
            'contextScopeStack': contextScopeStack,
            'handlers': handlers
          })
        }
      }
    }

}
*/
mgui.forEachChild = function(scopeStack, callback) {
  var i, scope = scopeStack.top
  if (!('@' in scope.dataNode)) return false
  for (i in scope.dataNode['@']) {
    callback(scopeStack, i)
  }
}

mgui.copyObject = function(obj) {
  var i, r = {},
    n = Object.getOwnPropertyNames(obj),
    nn
  for (i in n)
    nn = n[i], r[nn] = obj[nn]
  return r
}

mgui.setAttribute = function(thisScopeStack, attrName, options) {
  return thisScopeStack.top.dataNode.setAttribute(attrName, options)
}



mgui.openContext = function(params) {
  
  function _buildNodeBySchema(dataNode, schema) {
    // extern vars: digScopeStack, contextScopeStack
    var tAttrName, tAttrDefs, tBindType, tcAttrName, tAttrData,
      schemaClass, schemaClassName,
      nodeClass, nodeClassName = dataNode.nodeClassName,
      handlers = {}
    if (!('#' in dataNode))
      dataNode['#'] = {}

    schemaClassName=schema['#nodeClass']
    if (!!schemaClassName) {
      if (typeof schemaClassName === 'object')
      schemaClassName=schemaClassName['data']
      if (schemaClassName in mgui.classes)
        schemaClass = mgui.classes[schemaClassName]
      if ('schema' in schemaClass)
        _buildNodeBySchema(dataNode, schemaClass['schema'])
    }
    if((!!nodeClassName)&&(nodeClassName in mgui.classes)){
       nodeClass=mgui.classes[nodeClassName]
    }
    for (tAttrName in schema) {
      if (tAttrName.indexOf('#') === 0) {
        tAttrDefs = schema[tAttrName]
        // название атрибута без # в начале
        tcAttrName = tAttrName.substr(1)
        if ((!!nodeClass) && ('handlers' in nodeClass) && (tcAttrName in nodeClass['handlers'])) {
          handlers = mgui.copyObject(nodeClass['handlers'][tcAttrName])
        }
        if (typeof tAttrDefs === 'object') {
          tBindType = tAttrDefs['bind']
          if (tBindType !== undefined)
            tBindType = (tBindType in mgui.C.TYPE_MAP) ? mgui.C.TYPE_MAP[tBindType] : mgui.C.BT_AUTO
          mgui.setAttribute(digScopeStack, tcAttrName, {
            'data': tAttrDefs['data'],
            'nullable': tAttrDefs['nullable'],
            'bindType': tBindType,
            'type': tAttrDefs['type'],
            'contextScopeStack': contextScopeStack,
            'handlers': handlers
          })
        } else {
          tBindType = mgui.C.BT_AUTO
          tAttrData = tAttrDefs
          mgui.setAttribute(digScopeStack, tcAttrName, {
            'data': tAttrData,
            'type': typeof tAttrData,
            'contextScopeStack': contextScopeStack,
            'handlers': handlers
          })
        }
      }
    }
  }
  
  var newPath=params.newPath, 
    createIfNE=params.createIfNE, 
    scopeStack=params.scopeStack, 
    failIfExist=params.failIfExist, 
    strictCreate=params.strictCreate, 
    contextScopeStack=params.contextScopeStack,
    newSchema=params.newSchema,
    nodeClass, digScopeStack, schemaNode, 
    i, j, scope, s, 
    recordPath, dataNode, path,
    aPath = newPath.split('/')
  
  if ((aPath.length > 1) && (aPath[0] === '')) {
    aPath.shift()
  } else {
    if ((scopeStack !== undefined) && (scopeStack.length > 0)) {
      scope = scopeStack.top
      if (newPath === '') {
        scopeStack.push(scopeStack.top = scope)
        return scopeStack
      }
    }
  }
  if (scope !== undefined) {
    dataNode = scope.dataNode
    schemaNode = scope.schemaNode
    path = scope.path
  } else {
    dataNode = mgui.model
    if (dataNode === undefined) {
      dataNode = mgui.model = new mgui.DataNode('/')
    }
    schemaNode = mgui.schema // может быть undefined
    path = '/'
  }

  if (newSchema !== undefined)
    schemaNode = newSchema

  digScopeStack = []
  digScopeStack.push(digScopeStack.top = {
    dataNode: dataNode,
    schemaNode: schemaNode,
    path: path
  })

  for (i in aPath) {
    s = aPath[i]
    if (s === '') continue
    if (s.charAt(0) === '!') {
      // Если путь выглядит /env/config/server/!1234 - это путь типа 1,
      //   тогда 1234-это идентификатор записи
      // Если путь выглядит /env/config/server/!12-3 - это путь типа 2,
      //   тогда 12-номер страницы, 3 - номер строки (номера начинаются с 1)
      isRecordPath = 1
      recordPath = s.substr(1).trim()
      if ((j = recordPath.indexOf('-')) !== -1) {
        isRecordPath = 2
        pageNo = parseInt(recordPath.substr(0, j))
        pageRowNo = parseInt(recordPath.substr(j + 1))
      }
    } else {
      isRecordPath = 0
      path += (path.charAt(path.length - 1) !== '/') ? '/' + s : s
      if (newSchema === undefined) {
        // если продолжение блуждания по схеме, то используем ключ s Для входа в следующий узел
        if (schemaNode !== undefined) {
          if (s in schemaNode) schemaNode = schemaNode[s]
          else schemaNode = undefined
        }
      } else {
        // Чтобы не было перехода по верхнему условию
        newSchema = undefined
      }
      if (!('@' in dataNode)) {
        if (!createIfNE) return [false, "Узел '" + path + "' не содержит дочерних элементов"]
        if (strictCreate) {
          if (schemaNode === undefined) return [false, "Узел '" + path + "' не определен в схеме"]
        }
        dataNode['@'] = {}
      }
      if (s in dataNode['@']) {
        if (failIfExist)
          return [false, "Узел '" + s + "' уже есть в пространстве данных '" + path + "'"]
        dataNode = dataNode['@'][s]
        digScopeStack.push(digScopeStack.top = { 
          dataNode: dataNode, 
          schemaNode: schemaNode, path: path })
      } else {
        if (!createIfNE)
          return [false, "Узел '" + s + "' отсутствует в пространстве данных '" + path + "'"]
        // Узел отсутствует, но если указан флаг createIfNE, то создаем этот узел
        // с шаблонами класса из схемы, передавая dataNode в качестве родительского
        dataNode = dataNode['@'][s] = new mgui.DataNode(path, dataNode)
        if (!!contextScopeStack) {
          dataNode.contextPath = contextScopeStack.top.path
          dataNode.contextDataNode = contextScopeStack.top.dataNode
          dataNode.contextSchemaNode = contextScopeStack.top.schemaNode
        }

        digScopeStack.push(digScopeStack.top = {
          dataNode: dataNode, schemaNode: schemaNode, path: path
        })

        if (schemaNode !== undefined) {
          var cn = schemaNode['#nodeClass']
          if (!!cn) {
            if (typeof cn === 'object') cn = cn['data']
            if (cn in mgui.classes) {
              nodeClass = mgui.classes[cn]
              dataNode['nodeClassName'] = cn
              if ((nodeClass !== undefined) && ('methods' in nodeClass)) {
                dataNode.methods = nodeClass['methods']
                if('create' in dataNode.methods){
                  dataNode.methods['create'].call(dataNode, digScopeStack, contextScopeStack)
                }
              }
            } else {
              mgui.error('Unknown DataNode class: ' + cn)
            }
          }
          _buildNodeBySchema(dataNode, schemaNode)
        }
      }
    }
  }
  if (scopeStack === undefined) scopeStack = []
  scopeStack.push(scopeStack.top = {
    dataNode: digScopeStack.top.dataNode,
    path: digScopeStack.top.path,
    schemaNode: digScopeStack.top.schemaNode
  })
  return scopeStack
  
}

/**
 * Открывает узел видимости данных по адресу newPath, а если узла нет, то при createIfNE создает сам узел и промежуточные
 * @param {string} newPath новый путь
 * @param {boolean} создать узел, если отсутствует
 * @param {Array} текущий стек пространства имен, включая ссылку на текущую схему
 * @param {boolean} выход с ошибкой, если узел уже есть
 * @param {boolean} создавать только в соответствии со схемой
 * @param {array} - контекст данных стек пространства имен модели с которой связываются формулы внутри узла
 * @param {object} - новая схема
 * @returns ScopeStack||Array[false,errorText]
 **/
mgui.openPath = function(newPath, createIfNE, scopeStack, failIfExist, strictCreate, contextScopeStack, newSchema) {
  var nodeClass, digScopeStack, schemaNode, i, scope, s, dataNode, path,
    recordPath, j,  aPath = newPath.split('/')

  function _buildNodeBySchema(dataNode, schema) {
    // extern vars: digScopeStack, contextScopeStack
    var tAttrName, tAttrDefs, tBindType, tcAttrName, tAttrData,
      schemaClass, schemaClassName,
      nodeClass, nodeClassName = dataNode.nodeClassName,
      handlers = {}
    if (!('#' in dataNode))
      dataNode['#'] = {}

    schemaClassName=schema['#nodeClass']
    if (!!schemaClassName) {
      if (typeof schemaClassName === 'object')
      schemaClassName=schemaClassName['data']
      if (schemaClassName in mgui.classes)
        schemaClass = mgui.classes[schemaClassName]
      if ('schema' in schemaClass)
        _buildNodeBySchema(dataNode, schemaClass['schema'])
    }
    if((!!nodeClassName)&&(nodeClassName in mgui.classes)){
       nodeClass=mgui.classes[nodeClassName]
    }
    for (tAttrName in schema) {
      if (tAttrName.indexOf('#') === 0) {
        tAttrDefs = schema[tAttrName]
        // название атрибута без # в начале
        tcAttrName = tAttrName.substr(1)
        if ((!!nodeClass) && ('handlers' in nodeClass) && (tcAttrName in nodeClass['handlers'])) {
          handlers = mgui.copyObject(nodeClass['handlers'][tcAttrName])
        }
        if (typeof tAttrDefs === 'object') {
          tBindType = tAttrDefs['bind']
          if (tBindType !== undefined)
            tBindType = (tBindType in mgui.C.TYPE_MAP) ? mgui.C.TYPE_MAP[tBindType] : mgui.C.BT_AUTO
          mgui.setAttribute(digScopeStack, tcAttrName, {
            'data': tAttrDefs['data'],
            'nullable': tAttrDefs['nullable'],
            'bindType': tBindType,
            'type': tAttrDefs['type'],
            'contextScopeStack': contextScopeStack,
            'handlers': handlers
          })
        } else {
          tBindType = mgui.C.BT_AUTO
          tAttrData = tAttrDefs
          mgui.setAttribute(digScopeStack, tcAttrName, {
            'data': tAttrData,
            'type': typeof tAttrData,
            'contextScopeStack': contextScopeStack,
            'handlers': handlers
          })
        }
      }
    }
  }

  if ((aPath.length > 1) && (aPath[0] === '')) {
    aPath.shift()
  } else {
    if ((scopeStack !== undefined) && (scopeStack.length > 0)) {
      scope = scopeStack.top
      if (newPath === '') {
        scopeStack.push(scopeStack.top = scope)
        return scopeStack
      }
    }
  }
  if (scope !== undefined) {
    dataNode = scope.dataNode
    schemaNode = scope.schemaNode
    path = scope.path
  } else {
    dataNode = mgui.model
    if (dataNode === undefined) {
      dataNode = mgui.model = new mgui.DataNode('/')
    }
    schemaNode = mgui.schema // может быть undefined
    path = '/'
  }

  if (newSchema !== undefined)
    schemaNode = newSchema

  digScopeStack = []
  digScopeStack.push(digScopeStack.top = {
    dataNode: dataNode,
    schemaNode: schemaNode,
    path: path
  })

  for (i in aPath) {
    s = aPath[i]
    if (s === '') continue
    if (s.charAt(0) === '!') {
      // Если путь выглядит /env/config/server/!1234 - это путь типа 1,
      //   тогда 1234-это идентификатор записи
      // Если путь выглядит /env/config/server/!12-3 - это путь типа 2,
      //   тогда 12-номер страницы, 3 - номер строки (номера начинаются с 1)
      isRecordPath = 1
      recordPath = s.substr(1).trim()
      if ((j = recordPath.indexOf('-')) !== -1) {
        isRecordPath = 2
        pageNo = parseInt(recordPath.substr(0, j))
        pageRowNo = parseInt(recordPath.substr(j + 1))
      }
    } else {
      isRecordPath = 0
      path += (path.charAt(path.length - 1) !== '/') ? '/' + s : s
      if (newSchema === undefined) {
        // если продолжение блуждания по схеме, то используем ключ s Для входа в следующий узел
        if (schemaNode !== undefined) {
          if (s in schemaNode) schemaNode = schemaNode[s]
          else schemaNode = undefined
        }
      } else {
        // Чтобы не было перехода по верхнему условию
        newSchema = undefined
      }
      if (!('@' in dataNode)) {
        if (!createIfNE) return [false, "Узел '" + path + "' не содержит дочерних элементов"]
        if (strictCreate) {
          if (schemaNode === undefined) return [false, "Узел '" + path + "' не определен в схеме"]
        }
        dataNode['@'] = {}
      }
      if (s in dataNode['@']) {
        if (failIfExist)
          return [false, "Узел '" + s + "' уже есть в пространстве данных '" + path + "'"]
        dataNode = dataNode['@'][s]
        digScopeStack.push(digScopeStack.top = { 
          dataNode: dataNode, 
          schemaNode: schemaNode, path: path })
      } else {
        if (!createIfNE)
          return [false, "Узел '" + s + "' отсутствует в пространстве данных '" + path + "'"]
        // Узел отсутствует, но если указан флаг createIfNE, то создаем этот узел
        // с шаблонами класса из схемы, передавая dataNode в качестве родительского
        dataNode = dataNode['@'][s] = new mgui.DataNode(path, dataNode)
        if (!!contextScopeStack) {
          dataNode.contextPath = contextScopeStack.top.path
          dataNode.contextDataNode = contextScopeStack.top.dataNode
          dataNode.contextSchemaNode = contextScopeStack.top.schemaNode
        }

        digScopeStack.push(digScopeStack.top = {
          dataNode: dataNode, schemaNode: schemaNode, path: path
        })

        if (schemaNode !== undefined) {
          var cn = schemaNode['#nodeClass']
          if (!!cn) {
            if (typeof cn === 'object') cn = cn['data']
            if (cn in mgui.classes) {
              nodeClass = mgui.classes[cn]
              dataNode['nodeClassName'] = cn
              if ((nodeClass !== undefined) && ('methods' in nodeClass)) {
                dataNode.methods = nodeClass['methods']
                if('create' in dataNode.methods){
                  dataNode.methods['create'].call(dataNode, digScopeStack, contextScopeStack)
                }
              }
            } else {
              mgui.error('Unknown DataNode class: ' + cn)
            }
          }
          _buildNodeBySchema(dataNode, schemaNode)
        }
      }
    }
  }
  if (scopeStack === undefined) scopeStack = []
  scopeStack.push(scopeStack.top = {
    dataNode: digScopeStack.top.dataNode,
    path: digScopeStack.top.path,
    schemaNode: digScopeStack.top.schemaNode
  })
  return scopeStack
}

/** Выход из открытой области видимости */
mgui.closePath = function(scopeStack) {
  var l = scopeStack.length
  if (l > 0) scopeStack.pop()
  if (l > 1) scopeStack.top = scopeStack[l - 2]
  else scopeStack.top = undefined
}

mgui.showPage = function(pageId, callbackOnReady) {
  var page, r,
    vmScopeStack = mgui.openPath('/vmodel/pager', true),
    mScopeStack = mgui.openPath('/', true),
    pageNode = vmScopeStack.top.dataNode,
    el = pageNode.htmlElement
  if (!el)
    el = pageNode.htmlElement = mgui.guiContainer
  page = mgui.pages[pageId]
  if (!!page) {
    r = mgui.openPath(pageId, 1, vmScopeStack, 1, 1, mScopeStack, page)
    if (!r[0])
      mgui.error(r[1])
  }
  if (!!callbackOnReady)
    mgui.taskDoneCallbacks.push(callbackOnReady)

}


// Кладем в очередь действие. Обычно это [command, commandArgs]
mgui.run = function(action) {
  mgui.actions.push(action); // не проверяем однократность выполнения отдельных single команд (антидребезг)
  if (mgui.interval) {
    window.clearInterval(mgui.interval);
  }
  mgui.interval = window.setTimeout(mgui.dispatchActionQueue, 100);
}

// Вытаскиваем из очереди очередное действие �� выполняем его
mgui.dispatchActionQueue = function() {
  var a, c, s;
  while ((a = mgui.actions.pop())) {
    s = a.command;
    if (!!a.commandArgs) s += " (" + a.commandArgs + ")";
    mgui.log(s);
    switch (a.command) {
      case "EXT_BTN_DOWN":
        c = mgui.buttons.linkedCommands[a.commandArgs];
        if (c && c.command) mgui.run(c);
        if (a.commandArgs === "Back") {
          mgui.openPrevPage();
        }
        break;
      case "OPEN_PAGE":
        mgui.openPage(a.commandArgs);
        break;
    }
  }
};

// Логгер внизу экрана
mgui.logFormat = function(langStringKey, params, color) {
  mgui.log(mgui.format(mgui.lang.base[langStringKey], params), color)
}

mgui.log = function(s, color) {
  var l = document.getElementById("logger"),
    e = document.createElement('div')
  e.innerHTML = s
  if (!!color) e.style.color = color
  l.appendChild(e)
  l.scrollTop = l.scrollHeight
}

mgui.error = function(s) {
  mgui.log(s, 'red')
}

mgui.format = function(str, params) {
  var key
  for (key in params) {
    str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), params[key])
  }
  return str
}


/**
 * Подписка на сообщения от pub(публикатора) типа (msgType) и идентификатором подписчика (subpath)
 * @param {string} pubPath Путь к публикующему атрибуту
 * @param {any} msgType Тип сообщения на который формируется подписка
 * @param {string} subPath Путь к атрибуту подписчика
 * @param {function} callback Вызываемая функция
 * @returns {mgui.Binding}
 */
mgui.subscribe = function(pubPath, msgType, subPath, callback) {
  var binding, r, pe,
    pubExtraction = mgui.reExtractPath.exec(pubPath), //  pubExtraction[3] - название перед ':'. Пока не и
    pubPathNode = pubExtraction[1],
    pubPathAttr = pubExtraction[4],
    subExtraction = mgui.reExtractPath.exec(subPath),
    subPathNode = subExtraction[1],
    subPathAttr = subExtraction[4]

  function _digPath(pathElements, aNode, binding) {
    var prevNode = aNode,
      e, i
    for (i in pathElements) {
      e = pathElements[i]
      if (e === '') continue
      if (e in aNode) aNode = aNode[e]
      else {
        if (prevNode !== undefined) prevNode['#']++
          aNode = (aNode[e] = { '#': 0 })
      }
      prevNode = aNode
    }
    aNode['#'] = 1
    aNode['&'] = binding
    return aNode
  }

  binding = {
    pubPath: pubPath,
    subPath: subPath,
    subPathAttr: subPathAttr,
    pubPathAttr: pubPathAttr,
    pubPathNode: pubPathNode,
    subPathNode: subPathNode,
    msgType: msgType,
    callback: callback
  }

  pe = subPathNode.split('/')
  pe.push('@')
  pe.push(subPathAttr)
  pe.push(msgType)
  _digPath(pe, mgui.bindery.bySub, binding)

  pe = pubPathNode.split('/')
  pe.push('@')
  pe.push(pubPathAttr)
  pe.push(msgType)
  pe.push(subPath)
  _digPath(pe, mgui.bindery.byPub, binding)
  return binding
}

// Синхронная отправка сообщения после params идет параметр счетчика сообщения
mgui.emit = function(pubPath, pubAttr, msgType, params) {
  var e, pe, r, i, subPath, subscribers, result, binding, node = mgui.bindery.byPub,
    s, pp
  if (!pubAttr)
    pubAttr = "(Unknown attribute '" + pubPath + "' as emitter)"
  pe = pubPath.split('/')
  for (i in pe) {
    e = pe[i]
    if (e == "") continue
    if (e in node) {
      node = node[e]
    } else {
      return [false, "Пустая рассылка сообщения от узла на который никто не подписывался " + pubPath + '#' + pubAttr]
    }
  }

  if (!('@' in node))
    return [false, "Попытка отправить сообщение от узла у которого нет подписчиков '" + pubPath + "' (атрибут #" + pubAttr + "', сообщение '" + msgType + "')"]
  if (!(pubAttr in node['@']))
    return [false, "Попытка отправить сообщение '" + msgType + "' от атрибута '" + pubPath + '#' + pubAttr + "' на который никто не подписан"]
  if (!(msgType in node['@'][pubAttr]))
    return [false, "Попытка отправить незарегистрированное сообщение от атрибута '" + pubPath + '#' + pubAttr + "', тип сообщения '" + msgType + "'"]
  subscribers = node['@'][pubAttr][msgType]
  s = ''
  pp = '' // для отладки
  if ((!!params) && (!!params.newData)) pp = '=' + params.newData

  for (subPath in subscribers) {
    if (subPath != '#') {
      if ((!!params) && (!!params.caller) && (subPath == params.caller))
        continue
      binding = subscribers[subPath]['&']
      r = binding.callback(params)
      if (r === false)
        result = r
      else
      if (result === undefined && r !== undefined)
        result = r
      s += ((s !== '') ? ',' : '') + "'" + subPath + "'"
    }
  }
  mgui.log("Сообщение доставлено '" + msgType + "' от атрибута '" + pubPath + '#' + pubAttr + "'=>[" + s + ']' + pp, '#80ff80')
  return [true, result]
}


mgui.doLaterOnce = function(objId, obj, action, params) {
  mgui.taskListSize++
    if (!mgui.taskQueueInterval)
      mgui.taskQueueInterval = window.setInterval(mgui.taskRunner, 100)
  mgui.taskList[objId] = [mgui.taskListSize, obj, action, params]
}

mgui.taskRunner = function() {
  if (!mgui.taskListSize) {
    if (mgui.taskQueueInterval)
      window.clearInterval(mgui.taskQueueInterval)
    mgui.taskQueueInterval = 0
    return
  }
  var taskListClone, queue, m, loopTime, callback
  for (loopTime = 1; loopTime <= 4; loopTime++) {
    taskListClone = mgui.taskList, queue = []
    mgui.taskList = {}
    mgui.taskListSize = 0
    for (m in taskListClone)
      queue.push(taskListClone[m])
    queue.sort(function(a, b) { return a[0] - b[0] })
    while (!!(m = queue.shift())) {
      if (typeof m[2] == 'function')
        m[2].apply(m[1], m[3])
      else
      if (m[2] in m[1]) {
        mgui.log('--Executing' + m[2] + '--')
        m[1][m[2]].apply(m[1], m[3])
      }
    }
    if (!mgui.taskListSize) break
    mgui.log('-----loop ' + loopTime + '------', '#008000')
  }
  mgui.log('-----tasks over ----', '#00a000')
  if (!!mgui.taskDoneCallbacks) {
    while (!!(callback = mgui.taskDoneCallbacks.pop())) {
      (callback)()
    }
  }
}

mgui.postEmit = function(pubPath, pubAttr, msgType, params) {
  mgui.doLaterOnce(pubPath + '#' + pubAttr + '!' + msgType, this, mgui.emit, [pubPath, pubAttr, msgType, params])
}

mgui.unbindByPub = function(pubPath, referencingSub, ignoreBindery) {
  var pubPathNode = pubPath,
    pubPathAttr = 'value',
    binding, r, i, j, k, e, n1, n2, allAttrs = true,
    m, node = mgui.bindery.byPub,
    chain = [],
    pe, ce, nodeName
  if (pubPath.indexOf('#') >= 0) r = pubPath.split('#'), pubPathNode = r[0], pubPathAttr = r[1], allAttrs = false
  pe = pubPathNode.split('/')
  pe.push('@')
  for (i in pe) {
    e = pe[i]
    if (e === '') continue
    chain.push([e, node])
    if (e in node) node = node[e]
    else return [false, "Элемент " + e + ' не найден в связке подписчиков по пути ' + pubPath]
  }
  for (k in node) { // перебираем pubPathAttr
    if ((k == '#') || ((!allAttrs) && (k != pubPathAttr))) continue
    n1 = node[k]
    for (m in n1)
      if (m != '#') { // перебираем msgType
        n2 = n1[m]
        for (j in n2)
          if (j != '#') { // перебирем subPath, удаляем только связанные с referensingSub
            if ((referencingSub == undefined) || (referencingSub == j)) {
              if (!ignoreBindery) {
                binding = n2[j]['&']
                mgui.unbindBySub(binding.subPath, true)
              }
              delete n2[j]
              n2['#']--
            }
          }
        if (!n2['#']) delete n1[m], n1['#']--
      }
    if (!n1['#']) delete node[k], node['#']--
  }
  for (j = chain.length - 1; j >= 0; j--) {
    ce = chain[j]
    node = ce[1]
    nodeName = ce[0]
    if (node[nodeName]['#'] != 0) break
    delete node[nodeName]
    node['#']--
  }
}

mgui.unbindBySub = function(subPath, ignoreBindery) {
  var subPathNode = subPath,
    subPathAttr = 'value',
    binding, r, i, j, k, e, n1, allAttrs = true,
    node = mgui.bindery.bySub,
    chain = [],
    pe, ce, nodeName
  if (subPath.indexOf('#') >= 0) r = subPath.split('#'), subPathNode = r[0], subPathAttr = r[1], allAttrs = false
  pe = subPathNode.split('/')
  pe.push('@')
  for (i in pe) {
    e = pe[i]
    if (e === '') continue
    chain.push([e, node])
    if (e in node) node = node[e]
    else return [false, "Элемент " + e + ' не найден в связке подписчиков по пути ' + subPath]
  }
  for (k in node) {
    if ((k == '#') || ((!allAttrs) && (k != subPathAttr))) continue
    n1 = node[k]
    if (!ignoreBindery)
      for (j in n1)
        if (j != '#') {
          binding = n1[j]['&']
          mgui.unbindByPub(binding.pubPath, binding.subPath, true)
        }
    delete node[k]
    node['#']--
  }
  for (j = chain.length - 1; j >= 0; j--) {
    ce = chain[j]
    node = ce[1]
    nodeName = ce[0]
    if (node[nodeName]['#'] != 0) break
    delete node[nodeName]
    node['#']--
  }
}

mgui.parseExpression = function(str) {
  var C = mgui.C,
    symClasses = { '=': C.CC_OPERATOR, ',': C.CC_OPERATORCHAR, "'": C.CC_QUOTE, '"': C.CC_QUOTE, '-': C.CC_OPERATOR, '+': C.CC_OPERATOR, '*': C.CC_OPERATOR, '&': C.CC_OPERATOR, '{': C.CC_QUOTE, '(': C.CC_OPERATORCHAR, ')': C.CC_OPERATORCHAR, ' ': C.CC_SPACE, '\t': C.CC_SPACE, '\n': C.CC_SPACE, '\r': C.CC_SPACE },
    priorities = { '{': 0, '(': 0, '=': 2, ',': 1, '+': 5, '-': 5, '*': 7, '/': 7, '}': 9, ')': 9 },
    stack = [],
    out = [],
    bindings = [],
    res = _tokenize(str)
  if (res === true) {
    return [true, out, bindings]
  } else {
    return [false, 'Ошибка: ' + res[1] + ' в колонке ' + res[2] + '<br>' + str.substring(0, res[2] - 1) +
      '<font color="red"><b>' + str.substr(res[2] - 1, 1) + '</b></font>' + str.substr(res[2])
    ]
  }

  function _tokenize(src) {
    var r, pos = 0,
      l = src.length,
      ntChar, ctStart, C = mgui.C,
      ctClass = C.CC_NONE,
      ntClass, token, ctQuoteChar, prevTokenClass
    do {
      ntClass = C.CC_NONE
      ntChar = (pos < l) ? src.charAt(pos) : ''
      if (ctClass == C.CC_QUOTE) {
        if (ntChar == ctQuoteChar) {
          if (ntChar == '}') ctClass = C.CC_BIND
          else ctClass = C.CC_TEXT
        }
      } else {
        if (ntChar == '') ntClass = C.CC_EOT
        else if (ntChar in symClasses) ntClass = symClasses[ntChar]
        else if (((ntChar >= '0') && (ntChar <= '9')) || (ntChar == '.')) ntClass = C.CC_NUMBER
        else ntClass = C.CC_SYMBOL
        if (ntClass == C.CC_QUOTE) ctQuoteChar = (ntChar == '{') ? '}' : ntChar
        if ((ntClass != ctClass) || (ctClass == C.CC_OPERATORCHAR)) {
          if ((ctClass !== C.CC_NONE) && (ctClass !== C.CC_SPACE)) {
            token = ((ctClass == C.CC_TEXT) || (ctClass == C.CC_BIND)) ? src.substring(ctStart + 1, pos - 1) : src.substring(ctStart, pos)
            r = pushToRPN(ctClass, token, prevTokenClass, pos)
            if (r !== undefined) return r
          }
          if (ctClass !== C.CC_SPACE) prevTokenClass = ctClass
          ctClass = ntClass
          ctStart = pos
        }
      }
      pos++
    } while (ntChar != '')

    while (stack.length > 0) {
      r = stack.pop()
      if (r[0] == C.E_OPENEVAL) return [false, 'Лишняя открывающая скобка', r[2]]
      out.push(r)
    }
    return true
  }

  function pushToRPN(tokenClass, token, prevTokenClass, srcPos) {
    var paramNo, opener, p1, p2, topStackOperator, C = mgui.C
    if ((tokenClass == C.CC_SYMBOL) || (tokenClass == C.CC_TEXT) || (tokenClass == C.CC_BIND) || (tokenClass == C.CC_NUMBER)) {
      if (tokenClass == C.CC_TEXT) {
        out.push([C.E_TEXT, token, srcPos])
      } else if (tokenClass == C.CC_BIND) {
        //mgui.openPath(token,true,mScopeStack)
        //out.push([C.E_BIND,mScopeStack.top.path,srcPos])
        //mgui.closePath(mScopeStack)
        paramNo = bindings.indexOf(token)
        if (paramNo == -1) {
          bindings.push(token)
          paramNo = bindings.length - 1
        }
        out.push([C.E_BIND, [token, paramNo], srcPos])

      } else if (tokenClass == C.CC_NUMBER) {
        out.push([C.E_NUMBER, Number(token), srcPos])
      } else {
        out.push([C.E_SYMBOL, token, srcPos])
      }
    } else if ((tokenClass == C.CC_OPERATOR) || (tokenClass == C.CC_OPERATORCHAR)) {
      if (token == '(') {
        //if ((out.length>0)&&(out[out.length-1][0]==C.E_SYMBOL)) {
        if (prevTokenClass == C.CC_SYMBOL) {
          stack.push([C.E_OPENFUNC, token, srcPos])
        } else {
          stack.push([C.E_OPENEVAL, token, srcPos])
        }
      } else if (token == ')') {
        while ((stack.length > 0) && (stack[stack.length - 1][1] !== '(')) {
          out.push(stack.pop())
        }
        if (stack.length == 0) {
          return [false, 'Лишняя закрывающая скобка', srcPos]
        }
        opener = stack.pop()
        if (opener[0] == C.E_OPENFUNC) {
          out.push([C.E_CALLFUNC, 'popAndExecIt!'])
        }
      } else {
        p1 = priorities[token]
        while (stack.length > 0) {
          topStackOperator = stack[stack.length - 1]
          p2 = topStackOperator[3]
          if (p1 <= p2) {
            out.push(stack.pop())
          } else break;
        }
        stack.push([C.E_OPERATOR, token, srcPos, priorities[token]])
      }
    } else {
      return [false, "Неправильное выражение", srcPos]
    }
    return
  }

  function outAsText() {
    var i, e, s, r = []
    for (i in out) {
      e = out[i]
      s = '<td>' + e[0] + '</td><td>' + e[1] + '</td><td>#' + e[2] + '</td>'
      if (!!e[3]) s += '<td>^' + e[3] + '</td>'
      r.push('<tr>' + s + '</tr>')
    }
    return '<table cellpadding=5 border=1>' + r.join('\n') + '</table>'
  }
}

/** @param srcType - тип из которого делается преобразование
 * @param srcValue int - исходное значение
 * @param dstType - целевой тип
 * @param stringFormat - хэш параметров форматирования результата (обычно это хэш целевого атрибута)
 * @param inputMode - указывает, что преобразование происходит для отображения
 *   в поле ввода. Соответственно, игнорируются  лишние форматирующие символы
 * @return [status, convertedValue, errorMessage]
 */
mgui.convert = function(srcType, srcValue, dstType, stringFormat, inputMode) {
  if (dstType == srcType)
    return [mgui.C.CR_GOOD, srcValue]

  var r, v, ci, c2, lim, c, s, els, j, i, k, y, m, d, da, daLength, parts, t, tmpDate,
    formatLength, isNullable = 0,
    separator, scale = 0,
    thousandsSeparator, decimalSeparator

  thousandsSeparator = mgui.lang.base['THOUSANDS_SEPARATOR']
  decimalSeparator = mgui.lang.base['DECIMAL_SEPARATOR']
  if (stringFormat !== undefined) {
    if ('nullable' in stringFormat)
      isNullable = Boolean(stringFormat['nullable'])
    if ('thousandsSeparator' in stringFormat)
      thousandsSeparator = stringFormat['thousandsSeparator']
    if ('decimalSeparator' in stringFormat)
      decimalSeparator = stringFormat['decimalSeparator']
  }

  if (srcType === mgui.C.T_VARIANT)
    srcType = (typeof(srcValue) == 'number') ? mgui.C.T_NUMBER : srcType = mgui.C.T_STRING

  switch (dstType) {
    case mgui.C.T_NUMBER:
      if (srcValue === undefined) {
        if (!isNullable)
          v = 0
      } else {
        if (srcType === mgui.C.T_STRING) {
          t = srcValue
          if (decimalSeparator !== '')
            t = t.replace(new RegExp('\\' + decimalSeparator, "g"), '.')
          if (thousandsSeparator !== '')
            t = t.replace(new RegExp('\\' + thousandsSeparator, "g"), '')
          v = Number(t)
        } else if ((srcType === mgui.C.T_NUMBER) || (srcType === mgui.C.T_INT))
          v = srcValue
        else
          return [mgui.C.CR_ERROR, srcValue, mgui.lang.base['ERROR_UNKNOWN_NUMBER_SRCTYPE']]

        if (isNaN(v))
          return [mgui.C.CR_ERROR, srcValue, mgui.lang.base['ERROR_BAD_NUMBER']]
      }

      if (stringFormat !== undefined) {
        if ('max' in stringFormat) {
          lim = stringFormat['max']
          if (v > lim)
            v = lim
        }
        if ('min' in stringFormat) {
          lim = stringFormat['min']
          if (v < lim)
            v = lim
        }
      }
      r = [mgui.C.CR_GOOD, v]
      break

    case mgui.C.T_INT:
      if (srcValue === undefined) {
        if (!isNullable)
          v = 0
      } else {
        switch (srcType) {
          case mgui.C.T_INT:
            v = srcValue;
            break
          case mgui.C.T_STRING:
            v = parseInt(srcValue, 10);
            break
          case mgui.C.T_NUMBER:
            v = Math.ceil(srcValue);
            break
          default:
            return [mgui.C.CR_ERROR, srcValue, mgui.lang.base['ERROR_UNKNOWN_NUMBER_SRCTYPE']]
        }
        if (isNaN(v))
          return [mgui.C.CR_ERROR, srcValue, mgui.lang.base['ERROR_BAD_NUMBER']]
      }
      if (stringFormat !== undefined) {
        if ('max' in stringFormat) {
          lim = stringFormat['max']
          if (v > lim)
            v = lim
        }
        if ('min' in stringFormat) {
          lim = stringFormat['min']
          if (v < lim)
            v = lim
        }
        if ('bitMask' in stringFormat) {
          lim = stringFormat['bitMask']
          v &= lim
        }
        if ('bitSize' in stringFormat) {
          lim = (1 << stringFormat['bitSize']) - 1
          v &= lim
        }
        r = [mgui.C.CR_GOOD, v]
      }
      break

    case mgui.C.T_DATE: // dstType - T_DATE
      if ((srcValue == '') || (srcValue == undefined)) {
        r = (isNullable) ? [mgui.C.CR_GOOD] : [mgui.C.CR_ERROR, undefined, mgui.lang.base['ERROR_BAD_DATE']]
      } else {
        if (srcType == mgui.C.T_DATE)
          return [mgui.C.CR_GOOD, srcValue]
        else if (srcType == mgui.C.T_STRING) {
          da = srcValue.split(mgui.lang.base['DATE_SEPARATOR'], 4)
          daLength = da.length
          if (daLength !== 3) {
            return [mgui.C.CR_ERROR, undefined, mgui.lang.base['ERROR_NOT_DATE']]
          } else {
            els = mgui.lang.base['DATE_FORMAT_SHORT']
            if ((stringFormat !== undefined) && ('format' in stringFormat))
              els = stringFormat['format']
            formatLength = els.length
            j = k = 0
            for (i = 0; i < formatLength; i++) {
              c = els.charAt(i)
              for (s = c, i++; i < formatLength; i++) {
                ci = els.charAt(i)
                if (ci !== c)
                  break
                s += ci
              }
              switch (s) {
                case 'y':
                  y = parseInt(da[k++], 10)
                  if (y < 100) y += 2000
                  break
                case 'Y':
                  y = parseInt(da[k++], 10)
                  break
                case 'm':
                  m = parseInt(da[k++], 10)
                  break
                case 'M':
                  m = mgui.lang['SHORT_MONTHS'][da[k++].trim()]
                  break
                case 'd':
                  d = parseInt(da[k++], 10)
              }
            }
            if (!(isNaN(y) || isNaN(m) || isNaN(d))) {
              tmpDate = new Date(y, m - 1, d, 0, 0, 0, 0)
              if ((tmpDate.getDate() == d) && ((tmpDate.getMonth() + 1) == m) && (tmpDate.getFullYear() == y))
                r = [mgui.C.CR_GOOD, y + '-' + m + '-' + d]
              else
                r = [mgui.C.CR_ERROR, undefined, mgui.lang.base['ERROR_BAD_DATE']]
            } else
              r = [mgui.C.CR_ERROR, undefined, mgui.lang.base['ERROR_BAD_DATE_NUM']]
          }
        } else
          r = [mgui.C.CR_ERROR, undefined, mgui.lang.base['ERROR_UNKNOWN_DATE_SRCTYPE']]
      }
      break

    default: // dstType is T_STRING
      if (srcType == mgui.C.T_DATE) {
        // date=>string
        if ((srcValue === undefined) || (srcValue === '')) {
          return (isNullable) ? [mgui.C.CR_GOOD, undefined] : [mgui.C.CR_ERROR, undefined, mgui.lang.base['ERROR_BAD_DATE']]
        } else {
          da = srcValue.split('-', 4)
          if (da.length !== 3) {
            mgui.error('Ошибка внутреннего представления даты: ' + srcValue)
            return [mgui.CR_ERROR, srcValue, mgui.lang.base['ERROR_BAD_DATE']]
          } else {
            els = mgui.lang.base['DATE_FORMAT_SHORT']
            separator = mgui.lang.base['DATE_SEPARATOR']
            if (stringFormat !== undefined) {
              if (!inputMode) {
                if ('format' in stringFormat) els = stringFormat['format']
                if (els == 'short') els = mgui.lang.base['DATE_FORMAT_SHORT']
                if (els == 'long') els = mgui.lang.base['DATE_FORMAT_LONG']
              }
              if ('dateSeparator' in stringFormat)
                separator = stringFormat['dateSeparator']
            }
            formatLength = els.length
            v = []
            for (i = 0; i < formatLength; i++) {
              c = els.charAt(i)
              switch (c) {
                case 'y':
                  v.push(da[0]);
                  break
                case 'm':
                  v.push(da[1]);
                  break
                case 'd':
                  v.push(da[2]);
                  break
                case 'M':
                  v.push(mgui.lang['SHORT_MONTHS'][Number(da[1]) - 1]);
                  break
                case '/':
                  v.push(separator)
              }
            }
            v = v.join('')
          }
        }
      } else if (srcType == mgui.C.T_NUMBER) {
        // number=>string
        v = +srcValue
        if ((!inputMode) && (stringFormat !== undefined)) {
          // scale - число цифр после запятой
          if ('scale' in stringFormat) {
            scale = stringFormat['scale']
            v = srcValue.toFixed(scale)
          }
          v += ''
          parts = v.split('.')
          if (!!thousandsSeparator) {
            t = parts[0]
            j = t.length
            m = j % 3
            if (!m) m = 3
            els = []
            for (i = 0; i < j; i += m) {
              els.push(t.substr(i, m))
              m = 3
            }
            els = [els.join(thousandsSeparator)]
          } else
            els = [v]
          if ('prefix' in stringFormat)
            els.unshift(stringFormat['prefix'])
          if (('scale' in stringFormat) && (parts.length == 2)) {
            els.push(decimalSeparator)
            t = parts[1]
            j = stringFormat['scale']
            m = t.length
            if (m < j) {
              if ('repeat' in String.prototype)
                t += '0'.repeat(j - m)
              else
                for (i = j - m; i; i--)
                  t += '0'
            }
            els.push(t)
          }
          if ('suffix' in stringFormat)
            els.push(stringFormat['suffix'])
          v = els.join()
        }
      } else
        v = srcValue + ''
      r = [mgui.C.CR_GOOD, v]
      break
  }
  return r
}


mgui.getOperandValue = function(operand) {
  var dataNodeAttr, value, type = operand[0]
  if (type == mgui.C.T_BINDREF) {
    dataNodeAttr = operand[1]
    if ('value' in dataNodeAttr) {
      value = dataNodeAttr['value']
    } else {
      if ('data' in dataNodeAttr)
        value = dataNodeAttr['data']
      else
        value = mgui.C.T_UNDEFINED
    }
    type = dataNodeAttr['type']
  } else {
    value = operand[1]
  }
  return [type, value]
}


mgui.expressionElementHandlers = {}
mgui.expressionElementHandlers[mgui.C.E_BIND] = function(arg, stack, linkage) {
  var bindPubDataNodes = linkage.bindPubDataNodes,
    paramNo = arg[1] //paramNo
  var node = bindPubDataNodes[paramNo]
  if (!node)
    stack.push([mgui.C.T_UNDEFINED, '(' + arg[0] + ' is undefined)'])
  else
    stack.push([mgui.C.T_BINDREF, node])

}
mgui.expressionElementHandlers[mgui.C.E_TEXT] = function(arg, stack) {
  stack.push([mgui.C.T_STRING, arg])
}
mgui.expressionElementHandlers[mgui.C.E_OPERATOR] = function(arg, stack) {
  var op1, op2, r1, r2, value, r, rtype
  switch (arg) {
    case ',':
      op2 = stack.pop()
      op1 = stack.pop()
      if (op1[0] == mgui.C.T_TUPLE) {
        op1[1].push(op2)
        stack.push(op1)
      } else {
        op1 = [op1, op2]
        stack.push([mgui.C.T_TUPLE, op1])
      }
      return
    case '=':
      if (stack.length < 2) return [false, 'Для операции сравнения = необходимо два аргумента']
      op2 = stack.pop() // не проверяем типы. Пусть javascript сам приводит типы
      op1 = stack.pop()
      stack.push([mgui.C.T_NUMBER, (op1[1] == op2[1]) ? 1 : 0])
      return
    case '+':
      if (stack.length < 2) return [false, 'Для операции + необходимо два аргумента']
      op2 = stack.pop()
      op1 = stack.pop()
      // preffered - желаемый тип результата;
      // если операнд слева - строка, то r1[0] будет строкой и сложение будет уже
      // предпочтительно строковым
      r1 = mgui.getOperandValue(op1)
      r2 = mgui.getOperandValue(op2)
      rtype = r1[0] // обычно сумма двух значений должна приводиться к типу операнда слева

      if ((r1[0] == mgui.C.T_STRING) || (r2[0] == mgui.C.T_STRING)) {
        // Если левый или правый операнд - текст, то приводим к строковому типу
        rtype = mgui.C.T_STRING
        if (r1[0] == mgui.C.T_DATE) {
          if (!!r1[1]) {
            r = mgui.convert(mgui.C.T_DATE, r1[1], mgui.C.T_STRING)
            if (r[0] == mgui.C.CR_GOOD)
              value = r[1]
            else
              value = '[' + r[2] + ']'
          } else value = ''
        } else if (r1[0] == mgui.C.T_NUMBER) {
          value = mgui.convert(mgui.C.T_NUMBER, r1[1], mgui.C.T_STRING)
        } else if (r2[0] == mgui.C.T_INT) {
          value = '' + r1[1]
        } else
          value = r1[1]
        if (r2[0] == mgui.C.T_DATE) {
          if (!!r2[1]) {
            r = mgui.convert(mgui.C.T_DATE, r2[1], mgui.C.T_STRING)
            if (r[0] == mgui.C.CR_GOOD)
              value += r[1]
            else
              value += '[' + r[2] + ']'
          } // else добавляем пустую дату, то есть, ничего
        } else if (r2[0] == mgui.C.T_NUMBER) {
          r = mgui.convert(mgui.C.T_NUMBER, r2[1], mgui.C.T_STRING)
          if (r[0] == mgui.C.CR_GOOD)
            value += r[1]
          else
            value += '[' + r[2] + ']'
        } else if (r2[0] == mgui.C.T_INT) {
          value += '' + r2[1]
        } else
          value += r2[1]
      } else {
        // Если ни тот, ни другой операнд не являются текстом, то просто складываем значения
        value = r1[1] + r2[1]
      }
      stack.push([rtype, value])
      return
  }
}


mgui.expressionElementHandlers[mgui.C.E_SYMBOL] = function(arg, stack) {
  stack.push([mgui.C.T_STRING, arg])
}

mgui.expressionElementHandlers[mgui.C.E_CALLFUNC] = function(arg, stack) {
  var fnArgs = stack.pop()
  if (!fnArgs) return [false, 'Вызов непонятной функции']
  var fn = stack.pop()
  var fnName = fn[1]
  if (fnName in mgui.expressionFunctions) {
    return mgui.expressionFunctions[fnName](fnArgs, stack)
  } else {
    return [false, 'Неизвестная функция ' + fnName]
  }
}

mgui.expressionElementHandlers[mgui.C.E_NUMBER] = function(arg, stack) {
  stack.push([mgui.C.T_NUMBER, arg])
}

mgui.expressionFunctions = {}

mgui.expressionFunctions['iif'] = function(fnArgs, stack) {
  var r
  if (fnArgs[0] != mgui.C.T_TUPLE) return [false, 'Функция iif должна иметь три аргумента']
  var tuple = fnArgs[1]
  if (tuple.length != 3) return [false, 'Функция iif имеет ' + tuple.length + ' аргументов, а надо всего три']
  r = mgui.getOperandValue(tuple[0], mgui.C.T_NUMBER)
  if (r[1] === 0) {
    stack.push(tuple[2])
  } else {
    stack.push(tuple[1])
  }
}

mgui.expressionFunctions['sum'] = function(fnArgs, stack) {
  if (fnArgs[0] == mgui.C.T_TUPLE) {
    var i, v, tuple = fnArgs[1]
    v = (tuple[0][0] == mgui.C.T_NUMBER) ? 0 : ''
    for (i in tuple) {
      if ((tuple[i][0] == mgui.C.T_NUMBER) || (tuple[i][0] == mgui.C.T_INT))
        v += tuple[i][1]
      else
        v += Number(tuple[i][1])
    }
    stack.push([mgui.C.T_NUMBER, v])
  } else {
    stack.push([mgui.C.T_NUMBER, Number(fnArgs[1])])
  }
}


mgui.classes['page'] = {
  schema: {
    '#isPageActive': 1
  },
  handlers: {},

  methods: {
    'create': function(vmScopeStack, mScopeStack) {
      var self = this,
        schemaElId, schema = vmScopeStack.top.schemaNode
      self.htmlElement = document.createElement("div")
      for (schemaElId in schema) {
        if (schemaElId.indexOf('#') === -1) {
          mgui.openPath(schemaElId, 1, vmScopeStack, 1, 1, mScopeStack, schema[schemaElId])
          mgui.closePath(vmScopeStack)
        }
      }
      if (!!self.parentNode.htmlElement) {
        self.parentNode.htmlElement.appendChild(self.htmlElement)
      }
      self.updateCategory('all') // call refresh later
    },
    'update':function() {
      mgui.log('EXECUTE: page.update()','#80ff80')
      var self=this
      // Здесь надо будет сделать обработку разных категорий обновления,
      // например, блокировка дочерних элементов, если страница заблокирована

    }
  }
}

