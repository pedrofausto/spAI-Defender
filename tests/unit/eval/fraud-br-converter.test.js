/**
 * FraudWhatsApp.Br / FraudTelegram.Br converter tests (synthetic fixture only)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { convertCsv, detectDelimiter, parseCsv, sourceFromFileName } from '../../../eval/scripts/fraud-br-converter.js';

const fixture = readFileSync(resolve(__dirname, '../../fixtures/fraud-br-sample.csv'), 'utf8');
const options = { textColumn: 'mensagem', labelColumn: 'classe', positiveLabels: ['fraude'], source: 'fraudwhatsapp-br' };

describe('fraud-br converter', () => {
  test('converts the synthetic CSV to harness records', () => {
    const { records, skipped } = convertCsv(fixture, options);
    expect(skipped).toBe(1);
    expect(records).toHaveLength(4);
    expect(records.map(r => r.label)).toEqual(['scam', 'legit', 'scam', 'legit']);
    expect(records[0]).toEqual({
      id: 'fraudwhatsapp-br-000001',
      text: 'Oi mae, numero novo. Faz um pix pra mim?',
      label: 'scam',
      lang: 'pt',
      source: 'fraudwhatsapp-br'
    });
    expect(records[2].text).toBe('Texto com "aspas" e\nquebra de linha');
  });

  test('reports missing columns with the available ones', () => {
    expect(() => convertCsv(fixture, { ...options, textColumn: 'text' }))
      .toThrow('Column(s) "text" not found. Available columns: "mensagem", "classe", "origem".');
  });

  test('requires positive label values', () => {
    expect(() => convertCsv(fixture, { ...options, positiveLabels: [] })).toThrow(/positive label/);
  });

  test('detects delimiters and parses quoted CSV', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectDelimiter('a\tb')).toBe('\t');
    expect(parseCsv('a,b\r\n"x, y",2\r\n')).toEqual([['a', 'b'], ['x, y', '2']]);
  });

  test('derives the source from the file name', () => {
    expect(sourceFromFileName('FraudTelegram.csv')).toBe('fraudtelegram-br');
    expect(sourceFromFileName('fraudwhatsapp.csv')).toBe('fraudwhatsapp-br');
  });
});
