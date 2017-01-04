import { Foo } from 'foo'

export default class Bar {
  bar() {
    return 'bar'
  }

  foobar() {
    return new Foo().foo() + this.bar()
  }
}