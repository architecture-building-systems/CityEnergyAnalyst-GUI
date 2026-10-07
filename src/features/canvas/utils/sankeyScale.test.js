import { describe, expect, it } from 'vitest';

import { nodePad, plotHeight, scaledSize, stackPxPerUnit } from './sankeyScale';

// The same cases as the backend's cea/tests/test_sankey_scale.py, so the two
// copies of the scale model can't drift apart unnoticed.

const PAD = 24;
const MARGINS = 140;

// Plotly's own Sankey layout (d3-sankey): the scale it draws a figure at.
const plotlyPxPerUnit = (columns, plotH, pad) => {
  const maxN = Math.max(...columns.map(([, n]) => n));
  const p = maxN > 1 ? Math.min(pad, ((2 / 3) * plotH) / (maxN - 1)) : pad;
  return Math.min(
    ...columns.map(([total, n]) => (plotH - (n - 1) * p) / total),
  );
};

// Two-column figure: one source node per value, all into one sink.
const columnsOf = (values) => {
  const total = values.reduce((a, b) => a + b, 0);
  return [
    [total, values.length],
    [total, 1],
  ];
};

describe('sankeyScale', () => {
  it.each([
    [[10, 20, 5], 0.05],
    [[1, 1, 1, 1, 1, 1], 1],
    [[100], 12],
  ])('makes Plotly draw %j at the requested scale %f', (values, px) => {
    const columns = columnsOf(values);
    const h = plotHeight(columns, px, PAD);
    expect(plotlyPxPerUnit(columns, h, nodePad(columns, px, PAD))).toBeCloseTo(
      px,
      9,
    );
  });

  it('lowers the padding of short figures so Plotly does not cap it', () => {
    const columns = [
      [6, 6],
      [6, 1],
    ];
    const pad = nodePad(columns, 0.5, PAD);
    expect(pad).toBeLessThan(PAD);
    expect(
      plotlyPxPerUnit(columns, plotHeight(columns, 0.5, PAD), pad),
    ).toBeCloseTo(0.5, 9);
  });

  const figure = (values) => ({
    columns: columnsOf(values),
    pad: PAD,
    margins: MARGINS,
  });
  // One card per figure, as in compare columns.
  const cards = (figures, budget) =>
    figures.map((f) => ({ figures: [f], gaps: 0, budget }));
  const heights = (figures, px) => figures.map((f) => scaledSize(f, px).height);

  it('fills the card with the largest total and keeps every card inside its budget', () => {
    const figures = [figure([100, 50]), figure([60, 30])];
    const h = heights(figures, stackPxPerUnit(cards(figures, 750)));
    expect(Math.max(...h)).toBeGreaterThanOrEqual(749);
    expect(Math.max(...h)).toBeLessThanOrEqual(750);
    expect(h[1]).toBeLessThan(h[0]);
  });

  it('has no minimum height: a tiny total stays small next to a large one', () => {
    const figures = [figure([1000]), figure([1])];
    const h = heights(figures, stackPxPerUnit(cards(figures, 750)));
    expect(Math.max(...h)).toBeLessThanOrEqual(750);
    expect(Math.min(...h)).toBeLessThan(MARGINS + 5);
  });

  it('gives equal totals equal heights', () => {
    const figures = [figure([30, 10]), figure([20, 20])];
    const [a, b] = heights(figures, stackPxPerUnit(cards(figures, 600)));
    expect(a).toBe(b);
  });

  it('shares one card between its figures at one scale', () => {
    // Three what-ifs in one card: together they fill the card, each at the
    // same scale, so the larger total draws taller.
    const figures = [figure([400, 200]), figure([200, 100]), figure([100])];
    const stack = { figures, gaps: 24, budget: 1500 };
    const px = stackPxPerUnit([stack]);
    const h = heights(figures, px);
    const total = h.reduce((a, b) => a + b, stack.gaps);
    expect(total).toBeLessThanOrEqual(1500);
    expect(total).toBeGreaterThanOrEqual(1497);
    expect(h[0]).toBeGreaterThan(h[1]);
    expect(h[1]).toBeGreaterThan(h[2]);
    figures.forEach((f) => {
      expect(
        plotlyPxPerUnit(
          f.columns,
          plotHeight(f.columns, px, PAD),
          nodePad(f.columns, px, PAD),
        ),
      ).toBeCloseTo(px, 9);
    });
  });
});
