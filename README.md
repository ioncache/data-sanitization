# data-sanitization

## Overview

This package takes a pattern based approach to matching field names in data and then replacing the associated fields by either masking the field value or removing the field.

Objects are first converted to strings via `JSON.stringify`. This is done to have a consistent interface for text and non-text data.

NOTE: Since `JSON.stringify` might not be performant on large data sets, or when being run repeatedly, `v2` might take a different approach for non-string data.

After the pattern replacement, the new string is either returned or is converted back into an object via `JSON.parse` and then returned.

In any case where the data cannot be parsed, an error object is thrown.

## Table of Contents

- [data-sanitization](#data-sanitization)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Documentation](#documentation)
  - [TODO: Version 2](#todo-version-2)

## Documentation

TODO

## TODO: Version 2

Possibly take a different approach to data parsing for version 2.

- take an approach where instead of first converting all data to strings with `JSON.stringify`, instead attempt to convert all data to objects if it isn't already
- use `cloneDeepWith` from `lodash` to copy the object and modify/remove strings within the data
