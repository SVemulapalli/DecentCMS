// DecentCMS (c) 2014 Bertrand Le Roy, under MIT. See LICENSE.txt for licensing details.
'use strict';

module.exports = function titleTemplate(title, renderer) {
  renderer.write('<h1>');
  renderer.writeEncoded(title.text);
  renderer.writeLine('</h1>');
};