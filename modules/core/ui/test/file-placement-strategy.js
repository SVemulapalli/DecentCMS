// DecentCMS (c) 2014 Bertrand Le Roy, under MIT. See LICENSE.txt for licensing details.
'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const EventEmitter = require('events').EventEmitter;
const shapeHelper = require('../services/shape');

describe('File Placement Strategy', () => {
  // Set-up some mocked services
  const scope = new EventEmitter();
  const services = {
    shape: shapeHelper,
    "file-resolution": {
      all: () => [
        'module1/placement.json',
        'module2/placement.json',
        'module2/placement.js'
      ]
    }
  };
  scope.require = service => services[service];

  // And some placement using all the supported features
  const customPlacement = (scope, rootShape, shapes) => {
    for (let i = 0; i < shapes.length; i++) {
      if (shapeHelper.meta(shapes[i]).type === 'custom') {
        shapeHelper.place(rootShape, 'custom-zone', shapes[i], 'before');
        shapes.splice(i--, 1);
      }
    }
  };
  customPlacement['@noCallThru'] = true;

  const stubs = {
    'module1/placement.json': {
      matches: [
        {
          type: 'widget',
          path: 'sidebar', order: 'after'
        },
        {
          id: '^/foo/.*', type: '^(page|post)$', displayType: 'summary',
          path: 'content/header'
        },
        {
          type: '^page$', displayType: 'main',
          path: 'content', order: 'before'
        },
        {
          name: '^named$',
          path: 'zone2', order: '2'
        },
        {
          'meta.item.meta.type': '^deep-.*',
          path: 'zone2', order: '3'
        }
      ],
      'tag-cloud-widget': {path: 'footer'},
      shape1: {path: 'zone1', order: '2.1'},
      shape2: {path: 'zone1', order: '2.0'},
      shape3: {path: 'zone2', order: '1'},
      '@noCallThru': true
    },
    'module2/placement.json': {
      shape3: {path: 'zone1', order: '1'},
      '@noCallThru': true
    },
    'module2/placement.js': customPlacement
  };

  it('places shapes according to self-placement, placement.json file contents and placement.js', done => {
    const FilePlacementStrategy =
          proxyquire('../services/file-placement-strategy.js', stubs);
    const placementStrategy = new FilePlacementStrategy(scope);
    const layout = {};
    let homePage, pageBaz, pageFooBar, post, htmlWidget1, htmlWidget2, tagCloudWidget, shape11, shape12, shape2, shape3, named, deep, custom1, custom2, selfPlaced1, selfPlaced2;
    const shapes = [
      homePage =       {meta: {type: 'page'}, temp: {displayType: 'main'}, id: '/'},
      pageBaz =        {meta: {type: 'page'}, temp: {displayType: 'main'}, id: '/baz'},
      pageFooBar =     {meta: {type: 'page'}, temp: {displayType: 'summary'}, id: '/foo/bar'},
      post =           {meta: {type: 'post'}, temp: {displayType: 'summary'}, id: '/foo/post'},
      htmlWidget1 =    {meta: {type: 'html-widget'}, id: ':widget:html1'},
      htmlWidget2 =    {meta: {type: 'html-widget'}, id: ':widget:html2'},
      tagCloudWidget = {meta: {type: 'tag-cloud-widget'}, id: ':widget:tag-cloud'},
      shape11 =        {meta: {type: 'shape1'}, id: ':shape1:1'},
      shape12 =        {meta: {type: 'shape1'}, id: ':shape1:2'},
      shape2 =         {meta: {type: 'shape2'}, id: ':shape2:1'},
      shape3 =         {meta: {type: 'shape3'}, id: ':shape3:1'},
      named =          {meta: {type: 'named-shape', name: 'named'}, id: ':named:1'},
      deep =           {meta: {item: {meta: {type: 'deep-item'}}}},
      custom1 =        {meta: {type: 'custom'}, id: ':custom:1'},
      custom2 =        {meta: {type: 'custom'}, id: ':custom:2'},
      selfPlaced1 =    {meta: {placement: 'zone2:4'}, id: ':self-placed1:'},
      selfPlaced2 =    {meta: {placement: {path: 'zone2', order: '5'}}, id: ':self-placed2:'},
      {meta: {type: 'wont-get-placed'}, id: ':wont-get-placed:'}
    ];

    placementStrategy.placeShapes({
      shape: layout,
      shapes: shapes
    }, () => {
      // Check parents were set
      expect(layout.zones.content.temp.parent).to.equal(layout);
      expect(layout.zones.content.zones.header.temp.parent).to.equal(layout.zones.content);
      expect(layout.zones['custom-zone'].temp.parent).to.equal(layout);
      expect(layout.zones.sidebar.temp.parent).to.equal(layout);
      expect(layout.zones.zone1.temp.parent).to.equal(layout);
      expect(layout.zones.zone2.temp.parent).to.equal(layout);
      expect(homePage.temp.parent).to.equal(layout.zones.content);
      expect(pageBaz.temp.parent).to.equal(layout.zones.content);
      expect(pageFooBar.temp.parent).to.equal(layout.zones.content.zones.header);
      expect(post.temp.parent).to.equal(layout.zones.content.zones.header);
      expect(htmlWidget1.temp.parent).to.equal(layout.zones.sidebar);
      expect(htmlWidget2.temp.parent).to.equal(layout.zones.sidebar);
      expect(tagCloudWidget.temp.parent).to.equal(layout.zones.sidebar);
      expect(shape11.temp.parent).to.equal(layout.zones.zone1);
      expect(shape12.temp.parent).to.equal(layout.zones.zone1);
      expect(shape2.temp.parent).to.equal(layout.zones.zone1);
      expect(shape3.temp.parent).to.equal(layout.zones.zone2);
      expect(named.temp.parent).to.equal(layout.zones.zone2);
      expect(deep.temp.parent).to.equal(layout.zones.zone2);
      expect(selfPlaced1.temp.parent).to.equal(layout.zones.zone2);
      expect(selfPlaced2.temp.parent).to.equal(layout.zones.zone2);
      expect(custom1.temp.parent).to.equal(layout.zones['custom-zone']);
      expect(custom2.temp.parent).to.equal(layout.zones['custom-zone']);

      // Check all shapes were placed in the right zones, and in the right order
      expect(layout.zones.content.temp.items).to.deep.equal([pageBaz, homePage]);
      expect(layout.zones.content.zones.header.temp.items).to.deep.equal([pageFooBar, post]);
      expect(layout.zones['custom-zone'].temp.items).to.deep.equal([custom2, custom1]);
      expect(layout.zones.sidebar.temp.items).to.deep.equal([htmlWidget1, htmlWidget2, tagCloudWidget]);
      expect(layout.zones.zone1.temp.items).to.deep.equal([shape2, shape11, shape12]);
      expect(layout.zones.zone2.temp.items).to.deep.equal([shape3, named, deep, selfPlaced1, selfPlaced2]);
      done();
    });
  });
});
