import { test } from 'node:test';
import assert from 'node:assert/strict';
import { href, parseHash, safeNext } from '../src/routes';

test('parses the main routes', () => {
  assert.equal(parseHash('').name, 'home');
  assert.equal(parseHash('#/').name, 'home');
  assert.equal(parseHash('#/account').name, 'account');
  assert.equal(parseHash('#/cart').name, 'cart');
  const product = parseHash('#/product/P013?review=R1');
  assert.equal(product.name, 'product');
  if (product.name === 'product') {
    assert.equal(product.id, 'P013');
    assert.equal(product.params.get('review'), 'R1');
  }
  const products = parseHash('#/products?sort=deal');
  assert.equal(products.name === 'products' && products.params.get('sort'), 'deal');
  assert.equal(parseHash('#/nope').name, 'notFound');
  assert.equal(parseHash('#/product').name, 'notFound');
});

test('a malformed link shows the not-found page instead of crashing', () => {
  assert.equal(parseHash('#/product/%E0%A4%A').name, 'notFound');
});

test('link builders encode ids and round-trip', () => {
  const link = href.product('P 1/2');
  const route = parseHash(link);
  assert.equal(route.name === 'product' && route.id, 'P 1/2');
  assert.equal(href.products(), '#/products');
  assert.equal(href.products(new URLSearchParams('sort=deal')), '#/products?sort=deal');
});

test('post-login redirects stay inside the app', () => {
  assert.equal(safeNext('#/cart'), '#/cart');
  assert.equal(safeNext('https://evil.example'), '#/products');
  assert.equal(safeNext('#/login?next=%23%2Fcart'), '#/products');
  assert.equal(safeNext(null), '#/products');
});
