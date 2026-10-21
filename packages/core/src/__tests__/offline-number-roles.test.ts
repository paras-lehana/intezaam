/**
 * Tests for number roles (research note 09 §5.2.1 rules 1–9).
 *
 * Responsibility: time, date, age, guests, households, days, per-plate, budget and ignored
 * numbers, the approximation and cap words, and the evidence span a role covers.
 * Boundary: the inputs are short phrases the tests write; roles follow the research rules.
 */
import { describe, expect, it } from 'vitest';
import { readNumberMentions } from '../offline/number-roles.js';
import { quoteOf, tokenise } from '../offline/tokens.js';

function roles(text: string): string[] {
  return readNumberMentions(tokenise(text).tokens).map(
    (mention) => `${mention.role}:${mention.phrase.low}`,
  );
}

describe('readNumberMentions', () => {
  it('reads money and people in a Hinglish brief', () => {
    expect(roles('2 lakh mein 200 log')).toEqual(['budget:200000', 'guests:200']);
  });

  it('reads clock times with am, pm, baje and raat', () => {
    const times = (text: string): (string | undefined)[] =>
      readNumberMentions(tokenise(text).tokens).map((mention) => mention.hhmm);
    expect(times('DJ till 11:30 pm')).toEqual(['23:30']);
    expect(times('raat 11 baje tak')).toEqual(['23:00']);
    expect(times('raat 1 baje')).toEqual(['01:00']);
    expect(times('7 am')).toEqual(['07:00']);
    expect(times('7 pm')).toEqual(['19:00']);
    expect(roles('25:00 baje')).toEqual([]);
  });

  it('reads a number beside a month as a date, within one clause only', () => {
    expect(roles('25 Nov, Nov 25, 25th December')).toEqual(['date:25', 'date:25', 'date:25']);
    expect(roles('on 25 December, 120 residents')).toEqual(['date:25', 'guests:120']);
  });

  it('reads ordinals as ages and units as households and days', () => {
    expect(roles('7th birthday')).toEqual(['age:7']);
    expect(roles('saatvaan janamdin')).toEqual(['age:7']);
    expect(roles('150 flats, 10 days')).toEqual(['households:150', 'days:10']);
  });

  it('never reads a per-plate price as the budget', () => {
    expect(roles('per plate 1200')).toEqual(['per-plate:1200']);
    expect(roles('1200 per head')).toEqual(['per-plate:1200']);
  });

  it('reads money from multipliers or a money word before the number', () => {
    expect(roles('15k mein')).toEqual(['budget:15000']);
    expect(roles('budget Rs 40,000')).toEqual(['budget:40000']);
  });

  it('quotes the money word that made a plain number a budget', () => {
    const parsed = tokenise('party, budget Rs 40,000, mostly veg');
    const [mention] = readNumberMentions(parsed.tokens);
    expect(mention === undefined ? '' : quoteOf(parsed, mention.start, mention.end)).toBe(
      'Rs 40,000',
    );
  });

  it('ignores flat numbers, phone numbers and bare number words', () => {
    expect(roles('Flat 402, call 9876543210')).toEqual(['ignored:402', 'ignored:9876543210']);
    expect(roles('do it')).toEqual(['ignored:2']);
    expect(roles('do sau log')).toEqual(['guests:200']);
  });

  it('records approximation and cap words around a number', () => {
    const [about] = readNumberMentions(tokenise('lagbhag 100 log').tokens);
    const [plus] = readNumberMentions(tokenise('100+ log').tokens);
    const [tak] = readNumberMentions(tokenise('5 lakh tak').tokens);
    const [upto] = readNumberMentions(tokenise('upto 5 lakh').tokens);
    const [nahi] = readNumberMentions(tokenise('ek crore se upar nahi').tokens);
    expect([about?.approx, plus?.approx, plus?.role]).toEqual([true, true, 'guests']);
    expect([tak?.cap, upto?.cap, nahi?.cap]).toEqual([true, true, true]);
  });
});
