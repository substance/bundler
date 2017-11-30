# Ideas

## Better API for Custom Tasks 
<a name="better-custom-tasks"></a>

ATM `b.custom()` requires a `src` glob pattern, 
and a `execute(files)` method. It registers a watcher
for the input pattern, and calls the `execute` handler
with an array of files.
In some cases this is sufficient, i.e. when the task
is aggregating all input files producing one output.
It does not work well for a custom task that executes
on a file-by-file basis. If one file is changed, only that
file should be processed, not the others.
Furthermore, it is difficult to describe the 
generated output in this case, because the output depends
on the input files, which are not known in advance.

### Proposal

we should add an 'iterator' mode for `b.custom()`
which still takes the `src` as glob-pattern, but then calls
a handler on a file-by-file basis, providing a special `fs`
instance, that tracks reads and writes, and registers watchers
accordingly. This should lead to 

### Implementation

Introduce a new Command which is used when
`b.custom()` is called so:

```
b.custom(title, {
  src: pattern
  forEach(file, fs) { } 
})
```

# Log

## Start Making Plans

Started this document to record ideas.

# Someday

Ideas which have not been rejected
but where know that we won't address them soon

# Archive

Ideas here that have been implemented or rejected.