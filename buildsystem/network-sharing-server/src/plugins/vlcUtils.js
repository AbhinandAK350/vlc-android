import { vlcApi } from '../plugins/api.js'
import axios from 'axios'
import { useAppStore } from '../stores/AppStore'
import { useUploadStore } from '../stores/UploadStore'
import geti18n from "../i18n";

export default {
    install: (app) => {
        const appStore = useAppStore()
        const uploadStore = useUploadStore()
        app.config.globalProperties.$readableDuration = (ms) => {
            const seconds = Math.floor((ms / 1000) % 60)
            const minutes = Math.floor((ms / (60 * 1000)) % 60)
            const hours = Math.floor((ms / (3600 * 1000)) % 3600)
            return `${hours == 0 ? '' : hours + ":"}${hours == 0 && minutes < 10 ? minutes : minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`
        }
        app.config.globalProperties.$getAppAsset = (name, width) => {
            if (width < 0 || width === undefined) width = 24
            return vlcApi.appAsset(name, width)
        }

        app.config.globalProperties.$getImageUrl = (media, mediaType) => {
            if (mediaType == 'network' && media.artworkURL != "") return media.artworkURL
            return vlcApi.artwork(media.artworkURL, media.id, mediaType)
        }

        app.config.globalProperties.$download = (media, mediaType, directDownload) => {
            if (directDownload) {
                window.location.href = vlcApi.prepareDownload(media.id, mediaType)
            } else {
                appStore.warning = { type: "message", message: geti18n().global.t("PREPARING_DOWNLOAD") }
                axios.get(vlcApi.prepareDownload(media.id, mediaType)).then((response) => {
                    appStore.warning = undefined
                    window.location.href = vlcApi.download(response.data)
                });
            }
        }

        app.config.globalProperties.$play = (media, mediaType, append, asAudio) => {
            axios.get(vlcApi.play(media, mediaType, append, asAudio))
                .catch(function (error) {
                    if (error.response.status != 200) {
                        appStore.warning = { type: "warning", message: error.response.data }
                    }
                })
        }
        app.config.globalProperties.$resumePlayback = (isAudio) => {
            axios.get(vlcApi.resumePlayback(isAudio))
        }
        app.config.globalProperties.$upload = (file) => {
            const onUploadProgress = (progressEvent) => {
                const { loaded, total } = progressEvent;
                let percent = Math.floor((loaded * 100) / total);
                uploadStore.changeProgress(file, percent)
            };
            var formData = new FormData();
            formData.append("media", file);
            formData.append("filename", file.name)
            uploadStore.changeFileStatus(file, 'uploading')
            axios.post(`${vlcApi.uploadMedia}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress
            }).catch(function () {
                uploadStore.changeFileStatus(file, 'error')

            }).then(() => {
                uploadStore.changeFileStatus(file, 'uploaded')
            })
        }
    }
}