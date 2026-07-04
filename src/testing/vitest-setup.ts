// jsdom does not implement the Web Animations API. Base UI components call
// element.getAnimations() to coordinate enter/exit transitions; stub it to avoid
// "getAnimations is not a function" in component tests. Guarded for
// node-environment test files where Element is undefined.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = () => []
}
