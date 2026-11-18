// Ready-made designs for each product, based on the client's own laid projects.
import type { Design } from './geometry/trihex';

export type Preset = { id: string; name: string; nameMr: string; design: Design };

const d = (blockId: string, layoutId: string, pattern: Design['pattern'], palette: string[]): Design => ({
  blockId,
  layoutId,
  pattern,
  palette,
  overrides: {},
});

export const PRESETS: Record<string, Preset[]> = {
  hexsplit: [
    { id: 'chevron', name: 'Chevron Stripes', nameMr: 'शेवरॉन पट्टे', design: d('hexsplit', 'rows', 'halves', ['white', 'charcoal']) },
    { id: 'triangles', name: 'Tumbling Triangles', nameMr: 'त्रिकोण', design: d('hexsplit', 'triangles', 'checker', ['white', 'charcoal']) },
    { id: 'lattice', name: 'Hexagon Lattice', nameMr: 'षटकोन जाळी', design: d('hexsplit', 'hex', 'dots', ['grey', 'charcoal']) },
    { id: 'tricolour', name: 'Tricolour Triangles', nameMr: 'तिरंगी त्रिकोण', design: d('hexsplit', 'triangles', 'triad', ['terracotta', 'charcoal', 'sandstone']) },
    { id: 'cluster', name: 'Colour Clusters', nameMr: 'रंगीत गट', design: d('hexsplit', 'hex', 'mix', ['terracotta', 'sandstone', 'grey', 'charcoal']) },
  ],
  trihex: [
    { id: 'redyellow', name: 'Red & Yellow Rows', nameMr: 'लाल-पिवळ्या ओळी', design: d('trihex', 'standard', 'stripes', ['terracotta', 'sandstone']) },
    { id: 'medallion', name: 'Medallions', nameMr: 'मेडलियन', design: d('trihex', 'standard', 'rings', ['terracotta', 'sandstone', 'charcoal']) },
    { id: 'flower', name: 'Flowers', nameMr: 'फुले', design: d('trihex', 'standard', 'dots', ['grey', 'terracotta', 'sandstone']) },
    { id: 'greymix', name: 'Grey & Black Mix', nameMr: 'ग्रे-काळा मिश्र', design: d('trihex', 'standard', 'mix', ['grey', 'charcoal']) },
  ],
  chequer: [
    { id: 'diagonal', name: 'Stepped Diagonal', nameMr: 'तिरकी पायरी', design: d('chequer', 'stretcher', 'diagonal', ['white', 'charcoal']) },
    { id: 'checker', name: 'Red & Black Checker', nameMr: 'लाल-काळी चौकट', design: d('chequer', 'stack', 'checker', ['terracotta', 'charcoal']) },
    { id: 'panels', name: 'Panels', nameMr: 'पॅनेल', design: d('chequer', 'stack', 'rings', ['terracotta', 'sandstone', 'charcoal']) },
    { id: 'bands', name: 'Red with Black Bands', nameMr: 'काळ्या पट्ट्या', design: d('chequer', 'stack', 'bands', ['terracotta', 'charcoal']) },
  ],
  stonebrick: [
    { id: 'rangoli', name: 'Rangoli Diamond', nameMr: 'रांगोळी', design: d('stonebrick', 'stretcher', 'rings', ['white', 'sandstone', 'terracotta']) },
    { id: 'herring', name: 'Herringbone', nameMr: 'हेरिंगबोन', design: d('stonebrick', 'herringbone', 'bands', ['terracotta', 'sandstone']) },
    { id: 'basket', name: 'Basket Weave', nameMr: 'बास्केट वीव्ह', design: d('stonebrick', 'basket', 'checker', ['terracotta', 'white']) },
    { id: 'redfield', name: 'Red Field', nameMr: 'लाल मैदान', design: d('stonebrick', 'stretcher', 'mix', ['terracotta', 'terracotta', 'sandstone']) },
  ],
  brick: [
    { id: 'herringbone', name: 'Herringbone Bands', nameMr: 'हेरिंगबोन पट्टे', design: d('brick', 'herringbone', 'diagonal', ['grey', 'charcoal']) },
    { id: 'stretcher', name: 'Stretcher Stripes', nameMr: 'स्ट्रेचर पट्टे', design: d('brick', 'stretcher', 'stripes', ['grey', 'charcoal']) },
    { id: 'basket', name: 'Basket Weave', nameMr: 'बास्केट वीव्ह', design: d('brick', 'basket', 'halves', ['grey', 'white']) },
    { id: 'stack', name: 'Stack Checker', nameMr: 'स्टॅक चौकट', design: d('brick', 'stack', 'checker', ['white', 'charcoal']) },
  ],
};
