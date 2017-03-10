export default
class Task {
  constructor(name, fn, deps) {
    this.name = name
    this.fn = fn
    this.deps = deps
    this.description = ''
  }
  describe(description) {
    this.description = description
    return this
  }
}