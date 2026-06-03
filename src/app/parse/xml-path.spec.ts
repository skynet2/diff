import { xmlPathAtOffset } from './xml-path';

describe('xmlPathAtOffset (success)', () => {
  const xml = '<r>\n  <user id="1">\n    <name>alice</name>\n  </user>\n  <item>a</item>\n  <item>b</item>\n</r>';

  it('text of a simple element collapses to the element path', () => {
    const offset = xml.indexOf('alice') + 1;
    expect(xmlPathAtOffset(xml, offset)).toEqual(['r', 'user', 'name']);
  });

  it('attribute resolves to @_ key', () => {
    const offset = xml.indexOf('id="1"') + 1;
    expect(xmlPathAtOffset(xml, offset)).toEqual(['r', 'user', '@_id']);
  });

  it('repeated element gets an array index', () => {
    const offset = xml.indexOf('<item>b') + 4;
    expect(xmlPathAtOffset(xml, offset)).toEqual(['r', 'item', 1]);
  });

  it('returns null in leading whitespace before the root element', () => {
    expect(xmlPathAtOffset('  <r></r>', 0)).toBeNull();
  });

  it('returns the root path when the cursor is on the root tag', () => {
    expect(xmlPathAtOffset('<r></r>', 0)).toEqual(['r']);
  });

  it('keeps namespace prefixes on element names', () => {
    const xml = '<ns:a xmlns:ns="u"><ns:b>x</ns:b></ns:a>';
    const offset = xml.indexOf('>x<') + 1;
    expect(xmlPathAtOffset(xml, offset)).toEqual(['ns:a', 'ns:b']);
  });

  it('keeps the namespace declaration attribute key', () => {
    const xml = '<ns:a xmlns:ns="u"><ns:b>x</ns:b></ns:a>';
    const offset = xml.indexOf('xmlns:ns');
    expect(xmlPathAtOffset(xml, offset)).toEqual(['ns:a', '@_xmlns:ns']);
  });

  it('does not capture the left sibling at an adjacent boundary', () => {
    const xml = '<r><a>1</a><b>2</b></r>';
    const offset = xml.indexOf('<b>');
    expect(xmlPathAtOffset(xml, offset)).toEqual(['r', 'b']);
  });

  it('does not collapse an element that also contains a comment', () => {
    const xml = '<a><!-- c -->text</a>';
    const offset = xml.indexOf('text');
    expect(xmlPathAtOffset(xml, offset)).toEqual(['a', '#text']);
  });
});
