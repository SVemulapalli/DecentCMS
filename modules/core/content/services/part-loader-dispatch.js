// DecentCMS (c) 2015 Bertrand Le Roy, under MIT. See LICENSE.txt for licensing details.
'use strict';

var async = require('async');

/**
 * This part loader dispatch handler calls part loaders.
 * A part loader is a service that transforms a part's data right after it's been fetched
 * from storage.
 * An example could be the date part loader, that transforms date strings into actual date objects.
 * The part loaders must implement a service name of the form
 * `[part-type]-part-loader` with a `load` method that takes a context object and a callback function.
 * The context object has the following signature:
 * 
 * Param       | Type   | Description
 * ------------|--------|------------------------------------------------------------------
 * part        | *      | The part to load.
 * partName    | string | The name of the part.
 * item        | object | The content item that the part is a part of.
 * scope       | object | The scope.
 */
var PartLoaderDispatch = {
  feature: 'content',
  service: 'part-loader',
  /**
   * Calls part loaders for each part on `context.item`.
   * @param {object} context The context object.
   * @param {object} context.item The item the part belongs to.
   * @param {object} context.scope The scope.
   * @param {Function} done The callback.
   */
  load: function loadPart(context, done) {
    var item = context.item;
    var scope = context.scope;
    var contentManager = scope.require('content-manager');
    var type = contentManager.getType(item);
    var parts = contentManager.getParts(item);
    async.each(parts, function (part, next) {
      var partType = contentManager.getPartType(part, type);
      if (!partType) {next(); return;}
      scope.callService(partType + '-part-loader', 'load', {
        part: part,
        partName: partName,
        item: item,
        scope: scope
      }, next);
    }, done);
  }
};

module.exports = PartLoaderDispatch;