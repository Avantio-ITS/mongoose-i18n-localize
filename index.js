/* jshint node: true */
'use strict';

function forIn(obj, callb) {
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      var e = obj[k];
      callb(e, k);
    }
  }
}

function ArrNoDupe(a) {
  var temp = {},
    r = [],
    i = 0,
    k;
  for (i; i < a.length; i++) {
    temp[a[i]] = true;
  }
  forIn(temp, function (v, k) {
    r.push(k);
  });
  return r;
}

function addLocales(prePath, pathname, schema, options_locales) {
  var instance = schema.paths[pathname].instance,
    config = schema.paths[pathname].options;
  if (config.i18n && typeof instance === 'string' && instance.match(/^(String|Number|Boolean|Date)$/i)) {
    delete(config.i18n);
    config._i18n = true;
    schema.remove(pathname);

    options_locales.forEach(function (locale) {
      schema.path(pathname + '.' + locale, config);
    });
  }
}

function recursiveIteration(prePath, schema, options_locales) {
  forIn(schema.paths, function (schemaField, schemaPath) {
    if (schemaField.schema) {
      recursiveIteration(prePath + (prePath && '.') + schemaPath, schemaField.schema, options_locales);
    } else {
      addLocales(prePath, schemaField.path, schema, options_locales);
    }
  });
}

function getI18nCapsulePaths(prePath, schema) {
  var i18nPathCapsules = [],
    i18nCapsulePathMask = /^(.*)\.[^\.]*$/;
  forIn(schema.paths, function (schemaField, schemaPath) {
    if (schema.childSchemas.find(function (modSch) {
        return modSch.schema === schemaField.schema;
      })) {
      i18nPathCapsules = i18nPathCapsules.concat(getI18nCapsulePaths(prePath + (prePath && '.') + schemaPath, schemaField.schema));
    } else if (schemaField.options._i18n) {
      var i18nCapsulePath = (prePath + (prePath && '.') + schemaPath).replace(i18nCapsulePathMask, '$1');
      if (!~i18nPathCapsules.indexOf(i18nCapsulePath)) {
        i18nPathCapsules.push(i18nCapsulePath);
      }
    }
  });
  return i18nPathCapsules;
}

function localyzeRecursive(obj, i18nCapsulePathArr, o) {
  var thisSubObjPath = i18nCapsulePathArr[0],
    thisSubObj = obj && obj[thisSubObjPath],
    val, defVal;
  if (obj && i18nCapsulePathArr.length === 1) {
    if (obj[thisSubObjPath]) {
      if (o.locale) {
        val = obj[thisSubObjPath][o.locale];
      }
      defVal = obj[thisSubObjPath][o.defaultLocale];
      val = (typeof val !== 'undefined') ? val : defVal;
      if (o.only) {
        obj[thisSubObjPath] = val;
      } else {
        obj[thisSubObjPath].localized = val;
      }
    }
  } else if (thisSubObj && i18nCapsulePathArr.length > 1) {
    if (thisSubObj instanceof Array) {
      thisSubObj.map(function (i) {
        localyzeRecursive(i, i18nCapsulePathArr.slice(1), o);
      });
    } else {
      localyzeRecursive(thisSubObj, i18nCapsulePathArr.slice(1), o);
    }
  }
}

function addLocalized(o) {
  var _obj = o.toJSON ? o.obj.toJSON() : o.obj.toObject(),
    val, defVal, _i18n_paths = [];
  _i18n_paths = getI18nCapsulePaths('', o.obj.schema);
  for (const key in o.obj.$__.populated) {
    if (o.obj.$__.populated.hasOwnProperty(key)) {
      const element = o.obj.$__.populated[key];
      if (element.options.model) {
        _i18n_paths = getI18nCapsulePaths(key, element.options.model.schema).concat(_i18n_paths);
      }
    }
  }
  _i18n_paths.forEach(function (i18nCapsulePath) {
    var i18nCapsulePathArr = i18nCapsulePath.split('.');
    localyzeRecursive(_obj, i18nCapsulePathArr, o);
  });
  return _obj;
}

function guessMorphAndApply(_this, args, extra) {
  var o = {},
    target, options_defaultLocale = extra[3];
  if (typeof args[0] === 'string') {
    o.locale = args[0];
  } else if (args[0] && args[0].hasOwnProperty('isNew')) {
    target = args[0];
  }
  if (!o.locale && typeof args[1] === 'string') {
    o.locale = args[1];
  } else if (o.locale && typeof args[1] === 'string') {
    o.defaultLocale = args[1];
  }
  if (target && typeof args[2] === 'string') {
    o.defaultLocale = args[2];
  }
  if (!target && _this.hasOwnProperty('isNew')) {
    target = _this;
  }
  if (!o.defaultLocale) {
    o.defaultLocale = options_defaultLocale;
  }
  if (!o.locale) {
    o.locale = options_defaultLocale;
  }
  o.toJSON = extra[0];
  o.only = extra[1];
  o.obj = target;
  return addLocalized(o);
}

function mongooseI18nLocalyse(schema, options) {
  options = options || {};
  var options_locales = ArrNoDupe(options.locales || []),
    options_defaultLocale = options.defaultLocale;

  if (options_locales.length > 0) {
    recursiveIteration('', schema, options_locales);
    if (!~options_locales.indexOf(options_defaultLocale)) {
      options_defaultLocale = options_locales[0];
    }
  }

  schema.methods.toJSONLocalized = function () {
    return guessMorphAndApply(this, arguments, [true, false, 'toJSONLocalized', options_defaultLocale]);
  };

  schema.methods.toObjectLocalized = function () {
    return guessMorphAndApply(this, arguments, [false, false, 'toObjectLocalized', options_defaultLocale]);
  };

  schema.methods.toJSONLocalizedOnly = function () {
    return guessMorphAndApply(this, arguments, [true, true, 'toJSONLocalizedOnly', options_defaultLocale]);
  };

  schema.methods.toObjectLocalizedOnly = function () {
    return guessMorphAndApply(this, arguments, [false, true, 'toObjectLocalizedOnly', options_defaultLocale]);
  };

}

module.exports = mongooseI18nLocalyse;