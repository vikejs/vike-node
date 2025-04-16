import type * as Validators from './validators.js'

export type SupportedServers = typeof Validators.SupportedServers.infer

export type PhotonEntry = typeof Validators.PhotonEntry.infer
export type PhotonEntryServer = typeof Validators.PhotonEntryServer.infer
export type PhotonEntryUniversalHandler = typeof Validators.PhotonEntryUniversalHandler.infer
export type PhotonEntryAuto = typeof Validators.PhotonEntryAuto.infer
export type PhotonEntryBase = typeof Validators.PhotonEntryBase.infer

export type PhotonConfig = typeof Validators.PhotonConfig.infer

export type PhotonConfigResolved = typeof Validators.PhotonConfigResolved.infer

export type GetPhotonCondition = Validators.GetPhotonCondition
