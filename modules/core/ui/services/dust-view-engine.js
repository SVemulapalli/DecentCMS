// DecentCMS (c) 2014 Bertrand Le Roy, under MIT. See LICENSE.txt for licensing details.
'use strict';

/**
 * @description
 * A view engine using Dust templates.
 * http://akdubya.github.io/dustjs/
 * https://github.com/linkedin/dustjs/wiki/Dust-Tutorial
 *
 * The view engine exposes by default the standard helpers:
 * https://github.com/linkedin/dustjs-helpers
 *
 * Helpers
 * =======
 *
 * T
 * -
 * Makes the enclosed string localizable.
 *
 * ```
 * {@t}Text to localize{/t}
 * ```
 * 
 * Shape
 * -----
 * It adds a 'shape' helper that enables the rendering of
 * DecentCMS shapes. The shape helper takes a 'shape' parameter
 * that should point to the shape object to render.
 * If a shape is not provided, the current view model is used
 * (equivalent to '.').
 * Optional parameters are tag and class, which specify a HTML tag
 * that will surround the shape rendering.
 * Parameters with a name that is prefixed with 'data-' are copied
 * onto the surrounding tag.
 *
 * The following tag creates a 'footer' shape to be rendered with
 * the 'footer' object as its view model. It will be enclosed in
 * a `footer` tag with a `main-footer` class.
 * 
 * ```
 * {@shape shape=footer tag="footer" class="main-footer"/}
 * ```
 * 
 * The 'shape' attribute, if specified, points to the model object
 * representing the shape.
 * 
 * The 'name' attribute, if specified, tells the rendering engine
 * the base template name to use when looking for the best template
 * to render the shape.
 * 
 * Other parameters are copied onto the shape object, and can be used
 * from the template that will be used to render it.
 * If those parameters exist, that creates a shape object even when
 * one didn't exist before.
 * This means that the shape tag is a very simple way to structure
 * a complex template into multiple smaller and simpler ones.
 * 
 * For instance, the following tag will create a 'tweet' template and
 * render it in-place:
 * 
 * ```
 * {@shape name="tweet" text="{site.name} {episode} - {title|s}" url="{temp.baseUrl}/{id}" via="{site.twitter}" /}
 * ```
 * 
 * If the theme's views folder contains a `tweet.tl` template, it will
 * get rendered:
 * 
 * ```
 * <a href="https://twitter.com/intent/tweet?text={text|uc}&via={via|uc}&url={url|uc}" target="_blank">
 *  <span class="badge badge-dark share-twitter">
 *    <i class="fab fa-twitter"></i>
 *    <span class="share-text">Tweet</span>
 *  </span>
 * </a>
 * ```
 *  
 * Zone
 * -----
 * It adds a 'zone' helper that enables the rendering of special "zone"
 * shapes that can be used as target for dynamically placing other shapes.
 * 
 * Zones should have at least a name attribute.
 * Like shapes, an optional tag attribute enables for the zone rendering
 * to be surrounded by a tag if the zone is not empty.
 * Additional attributes get added to that tag if it's defined.
 * 
 * ```
 * {@zone name="main" tag="div" class="container"/}
 * ```
 *
 * Style
 * -----
 * Registers a style sheet.
 * Use the non-minimized name, without extension, as the name parameter.
 *
 * ```
 * {@style name="style"/}
 * ```
 * 
 * Styles
 * ------
 * Renders the list of registered styles.
 *
 * ```
 * {@styles/}
 * ```
 * 
 * Script
 * ------
 * Registers a script.
 * Use the non-minimized name, without extension, as the name parameter.
 *
 * ```
 * {@script name="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.js"/}
 * ```
 * 
 * Scripts
 * -------
 * Renders the list of registered scripts.
 *
 * ```
 * {@scripts/}
 * ```
 * 
 * Meta
 * ----
 * Registers a meta tag.
 * name: the name of the tag
 * value: the value of the tag (rendered as the content attribute)
 * Additional attributes will be rendered as-is.
 *
 * ```
 * {@meta name="generator" value="DecentCMS"/}
 * ```
 *
 * Metas
 * -----
 * Renders registered meta tags.
 *
 * ```
 * {@metas/}
 * ```
 * 
 * Link
 * ----
 * Registers a link tag, pointing to a relative resource.
 * For styles, use the style helper instead.
 * rel: specifies the relationship to the document
 * type: specifies the MIME type
 * href: the URL of the linked content
 * Additional attributes will be rendered as-is.
 *
 * ```
 * {@ link rel="icon" type="image/png" href="/media/favicon-128.png" sizes="128x128"/}
 * ```
 *
 * Links
 * -----
 * Renders registered link tags.
 *
 * ```
 * {@links/}
 * ```
 *
 * Date
 * ----
 * Formats a date using the Luxon library.
 * value: the date to format.
 * format: the format string to use (see <https://moment.github.io/luxon/docs/manual/formatting.html> for reference).
 *
 * ```
 * {@date value=date format="EEEE, MMMM d, yyyy"/}
 * ```
 * 
 * Dump
 * ----
 * A filter to pretty-print an object, skipping its 'temp' property.
 * This is particularly useful to dump the current content and debug templates.
 * Object graph loops are removed before the dump is performed.
 * 
 * ```
 * {meta|dump|s}
 * {.|dump|s}
 * ```
 * 
 * Note: you may need to install Node with full ICU support, in order
 * to format with locales other than 'en-US'.
 * 
 * Log
 * ---
 * A filter to dump the object to the browser's console.
 * This is useful to inspect the structure of an object using the rich UI of the browser's
 * dev tools without upsetting the page's layout.
 * Object graph loops are removed before the dump is performed.
 * 
 * ```
 * {meta|log}
 * {.|log}
 * ```
 * 
 * Plain
 * -----
 * A filter that removes tags and newlines from an HTML source.
 * 
 * ```
 * {body.html|plain}
 * ```
 * 
 * First Paragraph
 * ---------------
 * A filter that extracts the plain text from the first paragraph from an HTML string,
 * or all the text before a `<--more-->` tag.
 * 
 * ```
 * {body.html|firstp}
 * ```
 * 
 * @constructor
*/
var DustViewEngine = function DustViewEngine(scope) {
  this.scope = scope;

  // Non-scoped dependencies
  const RenderStream = require('./render-stream');
  const dust = require('dustjs-linkedin');
  dust.helper = require('dustjs-helpers');
  const DateTime = require('luxon').DateTime;
  const pretty = require('js-object-pretty-print').pretty;
  const striptags = require('striptags');

  function getDustTemplate(templatePath) {
    return function dustTemplate(shape, renderer, next) {
      if (renderer.scope && renderer.scope.parentScope) {
        ensureDustScope(renderer.scope.parentScope);
      }
      var stream = dust.stream(templatePath, shape)
        .on('data', function(data) {
          renderer.write(data);
        })
        .on('end', next)
        .on('error', function(err) {throw err;});
      stream['decent-renderer'] = renderer;
    };
  }

  // Ensure the dust global object is currently configured for this scope
  function ensureDustScope(scope) {
    if (dust.decentScope != scope.name) {
      dust.decentScope = scope.name;

      dust.config.whitespace = !!scope.debug;

      // Scoped dependencies
      const shapeHelper = scope.require('shape');
      const summarize = (scope.require('summarize-strategy') || {summarize: text => text}).summarize;

      dust.helpers.shape = function shapeDustHelper(chunk, context, bodies, params) {
        var shapeParam = params.shape;
        var theShape = shapeParam ? dust.helpers.tap(shapeParam, chunk, context) : null;
        var name, tag;
        var attributes = {};
        // Clone the shape, so that its attributes can be changed between different
        // renderings of the same shape.
        // Warning: shallow copy, so weird things may still happen for object and
        // array properties.
        var shape = theShape ? {meta: theShape.meta, temp: theShape.temp} : null;
        Object.getOwnPropertyNames(params)
          .forEach(function(paramName) {
            var param = dust.helpers.tap(params[paramName], chunk, context);
            switch(paramName) {
              case 'shape': break;
              case 'name':
                name = param;
                break;
              case 'tag':
                tag = param;
                break;
              case 'class':
                attributes['class'] = param;
                break;
              case 'style':
                attributes.style = param;
                break;
              default:
                if (paramName.substr(0, 5) === 'data-') {
                  attributes[paramName] = param;
                }
                else {
                  if (!shape) {
                    shape = {meta: {}, temp: {}};
                  }
                  shape[paramName] = param;
                }
            }
          });
        // If after that, we still don't have a shape, render nothing.
        if (!shape) {
          return chunk.map(function renderEmpty(chunk) {chunk.end();});
        }
        if (theShape) Object.getOwnPropertyNames(theShape)
          .forEach(function(propertyName) {
            if (propertyName === 'meta' || propertyName == 'temp') return;
            shape[propertyName] = theShape[propertyName];
          });
        var renderer = chunk.root['decent-renderer'];
        return chunk.map(function renderShapeFromDust(chunk) {
          var innerRenderer = new RenderStream(renderer.scope, {
            scripts: renderer.scripts,
            stylesheets: renderer.stylesheets,
            meta: renderer.meta,
            links: renderer.links,
            title: renderer.title
          });
          innerRenderer
            .on('data', function onShapeData(data) {
              chunk.write(data);
            })
            .onError(function(err) {
              renderer._onError(err);
              chunk.end();
            });
          innerRenderer
            .shape({shape: shape, tag: tag, attributes: attributes, shapeName: name})
            .finally(function() {
              chunk.end();
            });
        });
      };
    
      dust.helpers.zone = function zoneDustHelper(chunk, context, bodies, params) {
        var name, tag;
        var attributes = {};
        Object.getOwnPropertyNames(params)
          .forEach(function(paramName) {
            var param = dust.helpers.tap(params[paramName], chunk, context);
            switch(paramName) {
              case 'name':
                name = param;
                break;
              case 'tag':
                tag = param;
                break;
              default:
                attributes[paramName] = param;
              }
          });
        var zone = context.stack.head.zones[name];
        // If after that, we still don't have a zone, render nothing.
        if (!zone) {
          return chunk.map(function renderEmpty(chunk) {chunk.end();});
        }
        var renderer = chunk.root['decent-renderer'];
        return chunk.map(function renderZoneFromDust(chunk) {
          var innerRenderer = new RenderStream(renderer.scope, {
            scripts: renderer.scripts,
            stylesheets: renderer.stylesheets,
            meta: renderer.meta,
            links: renderer.links,
            title: renderer.title
          });
          innerRenderer
            .on('data', function onShapeData(data) {
              chunk.write(data);
            })
            .onError(function(err) {
              renderer._onError(err);
              chunk.end();
            });
          innerRenderer
            .shape({shape: zone, tag, attributes})
            .finally(function() {
              chunk.end();
            });
        });
      };
    
      dust.helpers.t = function localizationDustHelper(chunk, context, bodies) {
        var renderer = chunk.root['decent-renderer'];
        var scope = renderer.scope;
        var t = scope.require('localization') || function(s) {return s;};
        var body = dust.helpers.tap(bodies.block, chunk, context);
        var localizedBody = t(body);
        var reTokenized = localizedBody.replace(/\[([^\]]+)]/g, '{$1}');
        dust.loadSource(dust.compile(reTokenized, reTokenized));
        return chunk.map(function renderLocalizedString(chunk) {
          dust.render(reTokenized, context, function(err, rendered) {
            chunk.end(rendered);
          });
        });
      };
    
      dust.helpers.style = function styleDustHelper(chunk, context, bodies, params) {
        var stylesheet = dust.helpers.tap(params.name, chunk, context);
        if (!stylesheet) return;
        var renderer = chunk.root['decent-renderer'];
        if (/^(https?:)?\/\//.test(stylesheet)) {
          renderer._addExternalStyleSheet(stylesheet);
        }
        else {
          renderer._addStyleSheet(stylesheet);
        }
        return chunk;
      };
    
      dust.helpers.styles = function stylesDustHelper(chunk, context, bodies, params) {
        var renderer = chunk.root['decent-renderer'];
        var innerRenderer = new RenderStream(renderer.scope, {
          stylesheets: renderer.stylesheets
        });
        var html = '';
        innerRenderer.on('data', function onShapeData(data) {
          html += data;
        });
        innerRenderer._renderStyleSheets();
        return chunk.write(html);
      };
    
      dust.helpers.script = function scriptDustHelper(chunk, context, bodies, params) {
        var script = dust.helpers.tap(params.name, chunk, context);
        if (!script) return;
        var renderer = chunk.root['decent-renderer'];
        if (/^(https?:)?\/\//.test(script)) {
          renderer._addExternalScript(script);
        }
        else {
          renderer._addScript(script);
        }
        return chunk;
      };
    
      dust.helpers.scripts = function scriptsDustHelper(chunk, context, bodies, params) {
        var renderer = chunk.root['decent-renderer'];
        var innerRenderer = new RenderStream(renderer.scope, {
          scripts: renderer.scripts
        });
        var html = '';
        innerRenderer.on('data', function onShapeData(data) {
          html += data;
        });
        innerRenderer._renderScripts();
        return chunk.write(html);
      };
    
      dust.helpers.meta = function metaDustHelper(chunk, context, bodies, params) {
        var attributes = {};
        var name = null;
        var value = '';
        Object.getOwnPropertyNames(params).forEach(function forEachParam(attrName) {
          switch(attrName) {
            case 'name':
              name = dust.helpers.tap(params.name, chunk, context);
              break;
            case 'value':
              value = dust.helpers.tap(params.value, chunk, context);
              break;
            default:
              attributes[attrName] = dust.helpers.tap(params[attrName], chunk, context);
          }
        });
        var renderer = chunk.root['decent-renderer'];
        renderer._addMeta(name, value, attributes);
        return chunk;
      };
    
      dust.helpers.metas = function metasDustHelper(chunk, context, bodies, params) {
        var renderer = chunk.root['decent-renderer'];
        var innerRenderer = new RenderStream(renderer.scope, {
          meta: renderer.meta
        });
        var html = '';
        innerRenderer.on('data', function onShapeData(data) {
          html += data;
        });
        innerRenderer._renderMeta();
        return chunk.write(html);
      };
    
      dust.helpers.link = function linkDustHelper(chunk, context, bodies, params) {
        var attributes = {};
        var rel = '';
        var type = '';
        var href = '';
        Object.getOwnPropertyNames(params).forEach(function forEachParam(attrName) {
          switch(attrName) {
            case 'rel':
              rel = dust.helpers.tap(params.rel, chunk, context);
              break;
            case 'type':
              type = dust.helpers.tap(params.type, chunk, context);
              break;
            case 'href':
              href = dust.helpers.tap(params.href, chunk, context);
              break;
            default:
              attributes[attrName] = dust.helpers.tap(params[attrName], chunk, context);
          }
        });
        var renderer = chunk.root['decent-renderer'];
        renderer._addLink(rel, type, href, attributes);
        return chunk;
      };
    
      dust.helpers.links = function linksDustHelper(chunk, context, bodies, params) {
        var renderer = chunk.root['decent-renderer'];
        var innerRenderer = new RenderStream(renderer.scope, {
          links: renderer.links
        });
        var html = '';
        innerRenderer.on('data', function onShapeData(data) {
          html += data;
        });
        innerRenderer._renderLinks();
        return chunk.write(html);
      };
    
      dust.helpers.date = function dateDustHelper(chunk, context, bodies, params) {
        var renderer = chunk.root['decent-renderer'];
        var scope = renderer.scope;
        var locale = scope.require('shell').settings.locale || 'en-US';
        var val = dust.helpers.tap(params.value, chunk, context);
        if (!val) return chunk;
        var dt = (val.constructor === Date ? DateTime.fromJSDate(val) : DateTime.fromISO(val))
          .setLocale(locale);
        if (!dt.isValid) {
          dt = DateTime.fromJSDate(new Date(val));
        }
        var format = dust.helpers.tap(params.format, chunk, context) || DateTime.DATETIME_SHORT;
        return chunk.write(dt.toFormat(format));
      }
    
      dust.filters.dump = function dumpDustFilter(value) {
        var filteredValue = shapeHelper.copy(value);
        return pretty(filteredValue, 2, 'HTML');
      }
    
      dust.filters.log = function logDustFilter(value) {
        var filteredValue = shapeHelper.copy(value);
        return '<script>console.log(' + JSON.stringify(filteredValue) + ');</script>';
      }
    
      dust.filters.plain = function plainDustFilter(html) {
        return striptags(html).replace(/\s\s+/gm, ' ').replace(/[\r\n]/gm, ' ').trim();
      }
    
      dust.filters.firstp = html => summarize(html);
    }
  }

  ensureDustScope(scope);

  /**
   * @description
   * Loads the rendering function from the provided path.
   * @param {string} templatePath The path to the .dust file.
   * @param {Function} done The callback function to call when the template is loaded.
   * @returns {function} The template function.
   */
  this.load = function loadCodeTemplate(templatePath, done) {
    var fs = require('fs');
    if (dust.cache.hasOwnProperty(templatePath)) {
      return done(getDustTemplate(templatePath));
    }
    fs.readFile(templatePath, function readTemplate(err, template) {
      dust.register(
        templatePath,
        dust.loadSource(dust.compile(template.toString(), templatePath))
      );
      done(getDustTemplate(templatePath));
    });
  };
};

DustViewEngine.service = 'view-engine';
DustViewEngine.feature = 'dust-view-engine';
DustViewEngine.scope = 'shell';
DustViewEngine.prototype.extension = 'tl';

module.exports = DustViewEngine;