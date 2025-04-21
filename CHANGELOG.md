## [1.0.15](https://github.com/vikejs/vike-server/compare/v1.0.14...v1.0.15) (2025-04-21)


### Features

* add `hostname` option to `serve` util ([27052a1](https://github.com/vikejs/vike-server/commit/27052a1e52b2089fa69ed043f6c8894b7726c36c))



## [1.0.14](https://github.com/vikejs/vike-server/compare/v1.0.13...v1.0.14) (2025-04-06)


### Features

* add support for express@5 ([6e6d7a8](https://github.com/vikejs/vike-server/commit/6e6d7a8790f0c9d2654168601b6a6945329f5de2))



## [1.0.13](https://github.com/vikejs/vike-server/compare/v1.0.12...v1.0.13) (2025-04-04)


### Bug Fixes

* allow any `NODE_ENV` value (fix [#101](https://github.com/vikejs/vike-server/issues/101)) ([#109](https://github.com/vikejs/vike-server/issues/109)) ([49cdff7](https://github.com/vikejs/vike-server/commit/49cdff7e5eedb7e87c99eda96d80ce46e82f572a))

> [!NOTE]
> Update `vike` to `0.4.228` or above.



## [1.0.12](https://github.com/vikejs/vike-server/compare/v1.0.11...v1.0.12) (2025-04-02)


### Bug Fixes

* fix `$ vike preview` ([914d267](https://github.com/vikejs/vike-server/commit/914d267c750ae333976ada4f2c83836e4938ed0b))
* polish error message ([ce635a6](https://github.com/vikejs/vike-server/commit/ce635a61c8beee633005ddc895e47df9ecbfb691))
* update express adapter to fix redirect URL (fix [#103](https://github.com/vikejs/vike-server/issues/103)) ([#104](https://github.com/vikejs/vike-server/issues/104)) ([c3e8fca](https://github.com/vikejs/vike-server/commit/c3e8fcaafa96a3d221add11a1d621daa23ae5b11))



## [1.0.11](https://github.com/vikejs/vike-server/compare/v1.0.10...v1.0.11) (2025-04-01)


### Bug Fixes

* do not crash upon late errors (fix [#96](https://github.com/vikejs/vike-server/issues/96)) ([#97](https://github.com/vikejs/vike-server/issues/97)) ([950d2a2](https://github.com/vikejs/vike-server/commit/950d2a264a1971d6fe818f8f70f0e48a31b78e53))



## [1.0.10](https://github.com/vikejs/vike-server/compare/v1.0.9...v1.0.10) (2025-03-31)


### Bug Fixes

* rename `onServer` hook to `onCreate` ([#95](https://github.com/vikejs/vike-server/issues/95)) ([9da0f94](https://github.com/vikejs/vike-server/commit/9da0f94ab36307d4d4c95ea64f498d4e4807dc8a))


### Features

* `serve`: make `port` optional. Defaults to 3000 ([#95](https://github.com/vikejs/vike-server/issues/95)) ([de3a18f](https://github.com/vikejs/vike-server/commit/de3a18fe2141fe1369572c33ec82a11f6c94d5ba))


## [1.0.9](https://github.com/vikejs/vike-server/compare/v1.0.8...v1.0.9) (2025-03-31)


### Features

* `onServer` hook ([#94](https://github.com/vikejs/vike-server/issues/94)) ([26c1162](https://github.com/vikejs/vike-server/commit/26c1162d28f91f867b0583b4893cd7f6fa026854))



## [1.0.8](https://github.com/vikejs/vike-server/compare/v1.0.7...v1.0.8) (2025-03-30)


### Bug Fixes

* Show better error messages when entry file cannot be found ([6c95b57](https://github.com/vikejs/vike-server/commit/6c95b57d39155dce933b4b89001149a81132368f))



## [1.0.7](https://github.com/vikejs/vike-server/compare/v1.0.6...v1.0.7) (2025-03-28)


### Features

* move callback to onReady option ([#91](https://github.com/vikejs/vike-server/issues/91)) ([ddaa284](https://github.com/vikejs/vike-server/commit/ddaa284bc84731026b6293aed632842396301143))



## [1.0.6](https://github.com/vikejs/vike-server/compare/v1.0.5...v1.0.6) (2025-03-28)


### Features

* add callback parameter to `serve` functions ([#90](https://github.com/vikejs/vike-server/issues/90)) ([e27e96a](https://github.com/vikejs/vike-server/commit/e27e96a0dbef6d566d86f01d4945facd889670f8))



## [1.0.5](https://github.com/vikejs/vike-server/compare/v1.0.4...v1.0.5) (2025-03-27)


### Bug Fixes

* environment config conflicted with other packages ([c1a46a8](https://github.com/vikejs/vike-server/commit/c1a46a8afd71a4f371db24ce5f577daacbceb1d3))
* show server crash reason ([3b4ddf1](https://github.com/vikejs/vike-server/commit/3b4ddf191f98c66037f661b0f4e68cc5b2e97fa9))



## [1.0.4](https://github.com/vikejs/vike-server/compare/v1.0.3...v1.0.4) (2025-03-26)


### Bug Fixes

* **elysia:** applied middlewares can now return early responses ([#89](https://github.com/vikejs/vike-server/issues/89)) ([5ae0c1c](https://github.com/vikejs/vike-server/commit/5ae0c1c23610966e6c4e01d9b4c2f03b8033c471))
* servers as external dependencies ([4e03b4b](https://github.com/vikejs/vike-server/commit/4e03b4bfb269687ad7170db915af1879180180ab))



## [1.0.3](https://github.com/vikejs/vike-server/compare/v1.0.2...v1.0.3) (2025-03-26)


### Features

* forward serve options ([#88](https://github.com/vikejs/vike-server/issues/88)) (fixes [#86](https://github.com/vikejs/vike-server/issues/86)) ([4278420](https://github.com/vikejs/vike-server/commit/42784206f3b2c7ec06d6d2dec5d87a991f49e401))



## [1.0.2](https://github.com/vikejs/vike-server/compare/v1.0.1...v1.0.2) (2025-03-25)


### Bug Fixes

* better entry resolution when Vite root is specified. Fixes [#83](https://github.com/vikejs/vike-server/issues/83) ([9a6a91f](https://github.com/vikejs/vike-server/commit/9a6a91f9563f6ece0f7bc129153e68272c27b34d))



## [1.0.1](https://github.com/vikejs/vike-server/compare/v1.0.0...v1.0.1) (2025-03-25)


### Bug Fixes

* monkey-patch bindCLIShortcuts to show Vite server shortcuts ([6b30ebb](https://github.com/vikejs/vike-server/commit/6b30ebb324b58e8b01bb3aeed2fff26d7281b17a))



# [1.0.0](https://github.com/vikejs/vike-server/compare/v0.3.7...v1.0.0) (2025-03-25)


### Features

* `vike-node` superseded by `vike-server` ([#64](https://github.com/vikejs/vike-server/issues/64)) ([e618e63](https://github.com/vikejs/vike-server/commit/e618e6343c68c62cbb00d1548fde7e3492023043))

### BREAKING CHANGES

#### Migration from `vike-node`
https://github.com/vikejs/vike-server/blob/main/MIGRATION.md

#### Official documentation
https://vike.dev/server


## [0.3.7](https://github.com/vikejs/vike-node/compare/v0.3.6...v0.3.7) (2025-02-25)


### Bug Fixes

* fix static asset serving upon `baseAssets===/` ([#61](https://github.com/vikejs/vike-node/issues/61)) ([f4da489](https://github.com/vikejs/vike-node/commit/f4da489161c27bc19572480e1ea13947dbf8b2b6))



## [0.3.6](https://github.com/vikejs/vike-node/compare/v0.3.5...v0.3.6) (2025-02-13)


### Bug Fixes

* apply Base URL to static assets (fix [#60](https://github.com/vikejs/vike-node/issues/60)) ([76646c1](https://github.com/vikejs/vike-node/commit/76646c12934148357fbf375c17f4dd268d3a2d2d))
* load handleViteDevServer adapter only in dev ([#55](https://github.com/vikejs/vike-node/issues/55)) ([64a0757](https://github.com/vikejs/vike-node/commit/64a075790a0689bcd8f0cb1e3dc2be951999a264))



## [0.3.5](https://github.com/vikejs/vike-node/compare/v0.3.4...v0.3.5) (2025-01-31)


### Bug Fixes

* unable to pass esbuild config to standalone ([05ce19a](https://github.com/vikejs/vike-node/commit/05ce19ac43d7cc643221446270d609731767f378))



## [0.3.4](https://github.com/vikejs/vike-node/compare/v0.3.3...v0.3.4) (2025-01-31)


### Features

* allow passing extra esbuild options for standalone target ([#54](https://github.com/vikejs/vike-node/issues/54)) ([e2eabc2](https://github.com/vikejs/vike-node/commit/e2eabc2294a78c6770f1150a259ac0bbf1c77276))



## [0.3.3](https://github.com/vikejs/vike-node/compare/v0.3.2...v0.3.3) (2025-01-30)


### Bug Fixes

* make vite peer dependency optional ([4ab3b87](https://github.com/vikejs/vike-node/commit/4ab3b8720f9e25d6755c54f9f1bf94cffc8b63f9))
* revert vite peerDependency version change ([#52](https://github.com/vikejs/vike-node/issues/52)) ([a0a2b38](https://github.com/vikejs/vike-node/commit/a0a2b38be6c52ea1349bbd57804a7706ce5676d0))



## [0.3.2](https://github.com/vikejs/vike-node/compare/v0.3.1...v0.3.2) (2025-01-30)


### Bug Fixes

* Compare only the URL path component to expected value when proxying HMR websocket (fix [#53](https://github.com/vikejs/vike-node/issues/53)) ([#52](https://github.com/vikejs/vike-node/issues/52)) ([5ef5ee6](https://github.com/vikejs/vike-node/commit/5ef5ee66e50ee8bc581f7b752351f9a2ffe2931d))



## [0.3.1](https://github.com/vikejs/vike-node/compare/v0.3.0...v0.3.1) (2025-01-24)


### Bug Fixes

* update sirv dependency ([1c877c9](https://github.com/vikejs/vike-node/commit/1c877c9e5d3a77018f6c2080d5bd9a73bd60c129))



# [0.3.0](https://github.com/vikejs/vike-node/compare/v0.2.10...v0.3.0) (2025-01-12)


### chore

* set vike minimum version to 0.4.213 ([#42](https://github.com/vikejs/vike-node/issues/42)) ([e0f9d5e](https://github.com/vikejs/vike-node/commit/e0f9d5e54d63d0aaf5b1a70ad79fc9810242282a))


### BREAKING CHANGES

* update `vike` to `0.4.213` or above.



## [0.2.10](https://github.com/vikejs/vike-node/compare/v0.2.9...v0.2.10) (2025-01-09)


### Bug Fixes

* properly handle absolute outdir. Fixes [#38](https://github.com/vikejs/vike-node/issues/38) ([#40](https://github.com/vikejs/vike-node/issues/40)) ([0cc6921](https://github.com/vikejs/vike-node/commit/0cc6921398747ec9cb7df4074e75b689e569ac32))
* update error message ([452e55e](https://github.com/vikejs/vike-node/commit/452e55e28b302d12b0b36877ef080f0d37e969d8))



## [0.2.9](https://github.com/vikejs/vike-node/compare/v0.2.8...v0.2.9) (2024-12-17)


### Bug Fixes

* disable vike-node dev server in test mode ([#37](https://github.com/vikejs/vike-node/issues/37)) ([04cf43d](https://github.com/vikejs/vike-node/commit/04cf43dbbcaa2f5575412eb42fb005e25b161525))



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



