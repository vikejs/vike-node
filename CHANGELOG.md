## [0.2.8](https://github.com/vikejs/vike-node/compare/v0.2.7...v0.2.8) (2024-12-11)


### Features

* Add `runtime` to pageContext ([#33](https://github.com/vikejs/vike-node/issues/33)) ([8b209e8](https://github.com/vikejs/vike-node/commit/8b209e828dc6802f5806159d48ac45e84fe7daec))



## [0.2.7](https://github.com/vikejs/vike-node/compare/v0.2.6...v0.2.7) (2024-12-11)


### Bug Fixes

* __vite_hmr race condition. Fixes [#32](https://github.com/vikejs/vike-node/issues/32) ([1b07c47](https://github.com/vikejs/vike-node/commit/1b07c47075eccb04ab99842057d7f8fe25b36a5a))



## [0.2.6](https://github.com/vikejs/vike-node/compare/v0.2.5...v0.2.6) (2024-12-09)


### Bug Fixes

* improve error message upon `$ vite preview` ([2fa784e](https://github.com/vikejs/vike-node/commit/2fa784e8f14e57a8b765f2e068faf784e8a11330))



## [0.2.5](https://github.com/vikejs/vike-node/compare/v0.2.4...v0.2.5) (2024-12-09)

### Features

* better `pageContext` typing ([#29](https://github.com/vikejs/vike-node/issues/29))

### Bug Fixes

* do not override user provided `pageContext` with universal one ([#29](https://github.com/vikejs/vike-node/issues/29)) ([bc2d921](https://github.com/vikejs/vike-node/commit/bc2d921f73d430ef8001da6ddfb7b58b51882bae))


## [0.2.4](https://github.com/vikejs/vike-node/compare/v0.2.3...v0.2.4) (2024-12-09)

### Features

* add back `pageContext` function ([#28](https://github.com/vikejs/vike-node/issues/28))


## [0.2.3](https://github.com/vikejs/vike-node/compare/v0.2.2...v0.2.3) (2024-12-04)


### Bug Fixes

* also support Vite 5 (fix [#27](https://github.com/vikejs/vike-node/issues/27)) ([12e0022](https://github.com/vikejs/vike-node/commit/12e0022f6257244e243c3a2214c5a40df4b0d1d7))



## [0.2.2](https://github.com/vikejs/vike-node/compare/v0.2.1...v0.2.2) (2024-12-03)


### Bug Fixes

* add exports condition 'development|production' (to align Vite 5/6) ([7eb9690](https://github.com/vikejs/vike-node/commit/7eb9690a37244ea5335eb5b646ba3e61d23e36e4))
* remove unused code and support Vite 6 ([ae614c0](https://github.com/vikejs/vike-node/commit/ae614c0265d6489786dab49f19f454e08614967f))



## [0.2.1](https://github.com/vikejs/vike-node/compare/v0.2.0...v0.2.1) (2024-12-01)


### Bug Fixes

* vite peerDependencies range ([d6bce88](https://github.com/vikejs/vike-node/commit/d6bce880227d1cb8c776034747bfb43b0127a03f))



# [0.2.0](https://github.com/vikejs/vike-node/compare/v0.1.16...v0.2.0) (2024-11-28)


### Bug Fixes

* inject instead of auto import server entry ([#8](https://github.com/vikejs/vike-node/issues/8)) ([15eccda](https://github.com/vikejs/vike-node/commit/15eccda04e9b809140e0ad5f2c488c8d7d21fc7e))
* use `universal-middleware` ([#16](https://github.com/vikejs/vike-node/issues/16)) ([a7554a7](https://github.com/vikejs/vike-node/commit/a7554a7d9e0bff287aa4e9027afac295f527b80f))


### BREAKING CHANGES

* cache related options have been removed
* ~~the `pageContext` setting has been removed in favor of universal-middleware context~~
  * this breaking change has been reverted in versions >= 0.2.5
* `vike-node/connect` replaced by `vike-node/express`
* The `vike` middleware is now only exported as the default export:
* ```diff
  - import { vike } from 'vike-node/{express,fastify,h3,hono,elysia}'
  + import vike from 'vike-node/{express,fastify,h3,hono,elysia}'
  ```



## [0.1.16](https://github.com/vikejs/vike-node/compare/v0.1.15...v0.1.16) (2024-08-23)


### Bug Fixes

* stale value in closure ([78b7340](https://github.com/vikejs/vike-node/commit/78b73402e4a963132db44e8cb62f2589c7b7b01d))



## [0.1.15](https://github.com/vikejs/vike-node/compare/v0.1.14...v0.1.15) (2024-08-19)


### Bug Fixes

* createServerResponse duplicate onReadable calls ([ea74587](https://github.com/vikejs/vike-node/commit/ea74587d653b720dbb111fe0be41c81384d4253d))



## [0.1.14](https://github.com/vikejs/vike-node/compare/v0.1.13...v0.1.14) (2024-08-15)



## [0.1.13](https://github.com/vikejs/vike-node/compare/v0.1.12...v0.1.13) (2024-08-15)



## [0.1.12](https://github.com/vikejs/vike-node/compare/v0.1.11...v0.1.12) (2024-08-14)



## [0.1.11](https://github.com/vikejs/vike-node/compare/v0.1.10...v0.1.11) (2024-08-14)



## [0.1.10](https://github.com/vikejs/vike-node/compare/v0.1.9...v0.1.10) (2024-08-11)



## [0.1.9](https://github.com/vikejs/vike-node/compare/v0.1.8...v0.1.9) (2024-08-07)


### Bug Fixes

* fix wrong stacktraces ([ed62357](https://github.com/vikejs/vike-node/commit/ed623578095694db9cd719d120a771673e767d8b))



## [0.1.8](https://github.com/vikejs/vike-node/compare/v0.1.7...v0.1.8) (2024-08-07)


### Bug Fixes

* [#5](https://github.com/vikejs/vike-node/issues/5) ([d0a1187](https://github.com/vikejs/vike-node/commit/d0a1187e7326be2320002a5cc8af21061b5c395c))
* fix leaking promise ([052d16a](https://github.com/vikejs/vike-node/commit/052d16a0d5f81163632731dbccd0065ba27c5675))



## [0.1.7](https://github.com/vikejs/vike-node/compare/v0.1.6...v0.1.7) (2024-08-06)



## [0.1.6](https://github.com/vikejs/vike-node/compare/v0.1.5...v0.1.6) (2024-08-05)



## [0.1.5](https://github.com/vikejs/vike-node/compare/v0.1.4...v0.1.5) (2024-08-05)



## [0.1.4](https://github.com/vikejs/vike-node/compare/v0.1.3...v0.1.4) (2024-08-05)


### Bug Fixes

* fix createServerResponse memory leak ([c0f3788](https://github.com/vikejs/vike-node/commit/c0f37886f874faddd62a78ce133263fb6d2a0621))



## [0.1.3](https://github.com/vikejs/vike-node/compare/v0.1.2...v0.1.3) (2024-08-01)


### Features

* add h3 ([#2](https://github.com/vikejs/vike-node/issues/2)) ([12a856c](https://github.com/vikejs/vike-node/commit/12a856c69282827a47c6acb66e7cbd59dff542d5))



## [0.1.2](https://github.com/vikejs/vike-node/compare/v0.1.1...v0.1.2) (2024-07-31)


### Bug Fixes

* pass headersOriginal in pageContext ([70b16ce](https://github.com/vikejs/vike-node/commit/70b16cec24833d1626b0f712fe458c451d98d055))



## [0.1.1](https://github.com/vikejs/vike-node/compare/v0.1.0...v0.1.1) (2024-07-26)


### Bug Fixes

* update lru-cache, fix tests ([c644048](https://github.com/vikejs/vike-node/commit/c6440484a333d091dcc348e787fb758c23df24c7))



# 0.1.0 (2024-07-26)



