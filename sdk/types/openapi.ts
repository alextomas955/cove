// AUTO-GENERATED FILE. DO NOT EDIT.
export interface paths {
    "/api/ai-data/purge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["AiDataPurgeRequest"];
                    "application/json": components["schemas"]["AiDataPurgeRequest"];
                    "text/json": components["schemas"]["AiDataPurgeRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AiDataPurgeResult"];
                        "text/json": components["schemas"]["AiDataPurgeResult"];
                        "text/plain": components["schemas"]["AiDataPurgeResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/ai-data/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    hostId?: number;
                    hostType?: string;
                    kinds?: string;
                    modality?: string;
                    model?: string;
                    sourceKey?: string;
                    sourceRunId?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AiDataSummary"];
                        "text/json": components["schemas"]["AiDataSummary"];
                        "text/plain": components["schemas"]["AiDataSummary"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/ai-runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    page?: number;
                    perPage?: number;
                    runKey?: string;
                    sourceKey?: string;
                    status?: components["schemas"]["AiRunStatus"];
                    targetId?: number;
                    targetType?: components["schemas"]["AiRunTargetType"];
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfAiRun"];
                        "text/json": components["schemas"]["PaginatedResponseOfAiRun"];
                        "text/plain": components["schemas"]["PaginatedResponseOfAiRun"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/ai-runs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AiRun"];
                        "text/json": components["schemas"]["AiRun"];
                        "text/plain": components["schemas"]["AiRun"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/ApiTokens": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateApiTokenRequest"];
                    "application/json": components["schemas"]["CreateApiTokenRequest"];
                    "text/json": components["schemas"]["CreateApiTokenRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/ApiTokens/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    seed?: number;
                    sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfAudio"];
                        "text/json": components["schemas"]["PaginatedResponseOfAudio"];
                        "text/plain": components["schemas"]["PaginatedResponseOfAudio"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["AudioCreate"];
                    "application/json": components["schemas"]["AudioCreate"];
                    "text/json": components["schemas"]["AudioCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Audio"];
                        "text/json": components["schemas"]["Audio"];
                        "text/plain": components["schemas"]["Audio"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Audio"];
                        "text/json": components["schemas"]["Audio"];
                        "text/plain": components["schemas"]["Audio"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["AudioUpdate"];
                    "application/json": components["schemas"]["AudioUpdate"];
                    "text/json": components["schemas"]["AudioUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Audio"];
                        "text/json": components["schemas"]["Audio"];
                        "text/plain": components["schemas"]["Audio"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: {
                    deleteFile?: boolean;
                    deleteGenerated?: boolean;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/{id}/activity/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/{id}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["VideoHistory"];
                        "text/json": components["schemas"]["VideoHistory"];
                        "text/plain": components["schemas"]["VideoHistory"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/audios/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/{id}/rescan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/{id}/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkAudioUpdate"];
                    "application/json": components["schemas"]["BulkAudioUpdate"];
                    "text/json": components["schemas"]["BulkAudioUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfAudioFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfAudioFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfAudioFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfAudio"];
                        "text/json": components["schemas"]["PaginatedResponseOfAudio"];
                        "text/plain": components["schemas"]["PaginatedResponseOfAudio"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audios/from-file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["FileBackedCreate"];
                    "application/json": null | components["schemas"]["FileBackedCreate"];
                    "text/json": null | components["schemas"]["FileBackedCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Audio"];
                        "text/json": components["schemas"]["Audio"];
                        "text/plain": components["schemas"]["Audio"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Audit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    action?: string;
                    actor?: string;
                    outcome?: string;
                    page?: number;
                    perPage?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/bootstrap-owner": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BootstrapOwnerRequest"];
                    "application/json": components["schemas"]["BootstrapOwnerRequest"];
                    "text/json": components["schemas"]["BootstrapOwnerRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/bootstrap-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/change-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ChangePasswordRequest"];
                    "application/json": components["schemas"]["ChangePasswordRequest"];
                    "text/json": components["schemas"]["ChangePasswordRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/invite-info": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    token?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/invite-redeem": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["InviteRedeemRequest"];
                    "application/json": components["schemas"]["InviteRedeemRequest"];
                    "text/json": components["schemas"]["InviteRedeemRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["LoginRequest"];
                    "application/json": components["schemas"]["LoginRequest"];
                    "text/json": components["schemas"]["LoginRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["RefreshRequest"];
                    "application/json": null | components["schemas"]["RefreshRequest"];
                    "text/json": null | components["schemas"]["RefreshRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MeResponse"];
                        "text/json": components["schemas"]["MeResponse"];
                        "text/plain": components["schemas"]["MeResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/me/ui-preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["UserUiPreferences"];
                    "application/json": components["schemas"]["UserUiPreferences"];
                    "text/json": components["schemas"]["UserUiPreferences"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["RefreshRequest"];
                    "application/json": components["schemas"]["RefreshRequest"];
                    "text/json": components["schemas"]["RefreshRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/revoke-sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Auth/setup-token-redeem": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SetupTokenRedeemRequest"];
                    "application/json": components["schemas"]["SetupTokenRedeemRequest"];
                    "text/json": components["schemas"]["SetupTokenRedeemRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/content-rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    roleId?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateContentRuleRequest"];
                    "application/json": components["schemas"]["CreateContentRuleRequest"];
                    "text/json": components["schemas"]["CreateContentRuleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/content-rules/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["UpdateContentRuleRequest"];
                    "application/json": components["schemas"]["UpdateContentRuleRequest"];
                    "text/json": components["schemas"]["UpdateContentRuleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/content-rules/overrides": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    entityKind?: string;
                    roleId?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateEntityOverrideRequest"];
                    "application/json": components["schemas"]["CreateEntityOverrideRequest"];
                    "text/json": components["schemas"]["CreateEntityOverrideRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/content-rules/overrides/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/custom-fields": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    entityType?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CustomFieldDefinition"][];
                        "text/json": components["schemas"]["CustomFieldDefinition"][];
                        "text/plain": components["schemas"]["CustomFieldDefinition"][];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CustomFieldDefinitionSync"][];
                    "application/json": components["schemas"]["CustomFieldDefinitionSync"][];
                    "text/json": components["schemas"]["CustomFieldDefinitionSync"][];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CustomFieldDefinition"][];
                        "text/json": components["schemas"]["CustomFieldDefinition"][];
                        "text/plain": components["schemas"]["CustomFieldDefinition"][];
                    };
                };
            };
        };
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CustomFieldDefinitionCreate"];
                    "application/json": components["schemas"]["CustomFieldDefinitionCreate"];
                    "text/json": components["schemas"]["CustomFieldDefinitionCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CustomFieldDefinition"];
                        "text/json": components["schemas"]["CustomFieldDefinition"];
                        "text/plain": components["schemas"]["CustomFieldDefinition"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/custom-fields/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CustomFieldDefinitionUpdate"];
                    "application/json": components["schemas"]["CustomFieldDefinitionUpdate"];
                    "text/json": components["schemas"]["CustomFieldDefinitionUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CustomFieldDefinition"];
                        "text/json": components["schemas"]["CustomFieldDefinition"];
                        "text/plain": components["schemas"]["CustomFieldDefinition"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BackupResult"];
                        "text/json": components["schemas"]["BackupResult"];
                        "text/plain": components["schemas"]["BackupResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/config/backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ConfigBackupResult"];
                        "text/json": components["schemas"]["ConfigBackupResult"];
                        "text/plain": components["schemas"]["ConfigBackupResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/config/latest-backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/config/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["RestoreBackupRequest"];
                    "application/json": components["schemas"]["RestoreBackupRequest"];
                    "text/json": components["schemas"]["RestoreBackupRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/migrate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DatabaseMigrationResult"];
                        "text/json": components["schemas"]["DatabaseMigrationResult"];
                        "text/plain": components["schemas"]["DatabaseMigrationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/optimize": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["RestoreBackupRequest"];
                    "application/json": components["schemas"]["RestoreBackupRequest"];
                    "text/json": components["schemas"]["RestoreBackupRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RestoreBackupResult"];
                        "text/json": components["schemas"]["RestoreBackupResult"];
                        "text/plain": components["schemas"]["RestoreBackupResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Database/wipe": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["WipeResult"];
                        "text/json": components["schemas"]["WipeResult"];
                        "text/plain": components["schemas"]["WipeResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Embeddings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    hostId?: number;
                    hostType?: components["schemas"]["EmbeddingHostType"];
                    kind?: string;
                    kindFamily?: string;
                    page?: number;
                    perPage?: number;
                    sourceKey?: string;
                    sourceRunId?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfEmbedding"];
                        "text/json": components["schemas"]["PaginatedResponseOfEmbedding"];
                        "text/plain": components["schemas"]["PaginatedResponseOfEmbedding"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["AiDataSelector"];
                    "application/json": components["schemas"]["AiDataSelector"];
                    "text/json": components["schemas"]["AiDataSelector"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AiDataPurgeResult"];
                        "text/json": components["schemas"]["AiDataPurgeResult"];
                        "text/plain": components["schemas"]["AiDataPurgeResult"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Embeddings/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Embedding"];
                        "text/json": components["schemas"]["Embedding"];
                        "text/plain": components["schemas"]["Embedding"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Embeddings/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EmbeddingSearchRequest"];
                    "application/json": components["schemas"]["EmbeddingSearchRequest"];
                    "text/json": components["schemas"]["EmbeddingSearchRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EmbeddingSearchResult"][];
                        "text/json": components["schemas"]["EmbeddingSearchResult"][];
                        "text/plain": components["schemas"]["EmbeddingSearchResult"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/{hostType}/{hostId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    hostId: number;
                    hostType: components["schemas"]["AffinityHostType"];
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EntityEngagement"];
                        "text/json": components["schemas"]["EntityEngagement"];
                        "text/plain": components["schemas"]["EntityEngagement"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/{hostType}/{hostId}/favorite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    hostId: number;
                    hostType: components["schemas"]["AffinityHostType"];
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityFavorite"];
                    "application/json": components["schemas"]["EntityFavorite"];
                    "text/json": components["schemas"]["EntityFavorite"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EntityEngagement"];
                        "text/json": components["schemas"]["EntityEngagement"];
                        "text/plain": components["schemas"]["EntityEngagement"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/{hostType}/{hostId}/rating": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    hostId: number;
                    hostType: components["schemas"]["AffinityHostType"];
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["VideoRating"];
                    "application/json": components["schemas"]["VideoRating"];
                    "text/json": components["schemas"]["VideoRating"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EntityEngagement"];
                        "text/json": components["schemas"]["EntityEngagement"];
                        "text/plain": components["schemas"]["EntityEngagement"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/{hostType}/{hostId}/ratings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    hostId: number;
                    hostType: components["schemas"]["AffinityHostType"];
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EntityRatings"];
                        "text/json": components["schemas"]["EntityRatings"];
                        "text/plain": components["schemas"]["EntityRatings"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/activity/reset-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityEngagementBatchRequest"];
                    "application/json": components["schemas"]["EntityEngagementBatchRequest"];
                    "text/json": components["schemas"]["EntityEngagementBatchRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EntityEngagement"][];
                        "text/json": components["schemas"]["EntityEngagement"][];
                        "text/plain": components["schemas"]["EntityEngagement"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/interactions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    hostId?: number;
                    hostType?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EngagementInteraction"][];
                        "text/json": components["schemas"]["EngagementInteraction"][];
                        "text/plain": components["schemas"]["EngagementInteraction"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EngagementInteractionWrite"];
                    "application/json": components["schemas"]["EngagementInteractionWrite"];
                    "text/json": components["schemas"]["EngagementInteractionWrite"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/engagement/wipe-all": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    category?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ExtensionInfo"][];
                        "text/json": components["schemas"]["ExtensionInfo"][];
                        "text/plain": components["schemas"]["ExtensionInfo"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/{id}/data": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/{id}/data/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    key: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": string;
                    "application/json": string;
                    "text/json": string;
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/{id}/dependencies/missing": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": string[];
                        "text/json": string[];
                        "text/plain": string[];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/{id}/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/{id}/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/{id}/jobs/{jobId}/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                    jobId: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | {
                        [key: string]: string;
                    };
                    "application/json": null | {
                        [key: string]: string;
                    };
                    "text/json": null | {
                        [key: string]: string;
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/assets/{extensionId}/{path}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    extensionId: string;
                    path: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/bundles/ui.css": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/bundles/ui.mjs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": string[];
                        "text/json": string[];
                        "text/plain": string[];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/dependencies/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DependencyProblem"][];
                        "text/json": components["schemas"]["DependencyProblem"][];
                        "text/plain": components["schemas"]["DependencyProblem"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/install-from-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["InstallExtensionFromUrlRequest"];
                    "application/json": components["schemas"]["InstallExtensionFromUrlRequest"];
                    "text/json": components["schemas"]["InstallExtensionFromUrlRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/manifest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["UIManifest"];
                        "text/json": components["schemas"]["UIManifest"];
                        "text/plain": components["schemas"]["UIManifest"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/registry/{extensionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    extensionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RegistryExtensionDetail"];
                        "text/json": components["schemas"]["RegistryExtensionDetail"];
                        "text/plain": components["schemas"]["RegistryExtensionDetail"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/registry/{extensionId}/dependencies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    extensionId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DependencyInfo"][];
                        "text/json": components["schemas"]["DependencyInfo"][];
                        "text/plain": components["schemas"]["DependencyInfo"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/registry/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/registry/install": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["RegistryInstallRequest"];
                    "application/json": components["schemas"]["RegistryInstallRequest"];
                    "text/json": components["schemas"]["RegistryInstallRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RegistryInstallResult"];
                        "text/json": components["schemas"]["RegistryInstallResult"];
                        "text/plain": components["schemas"]["RegistryInstallResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/registry/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    category?: string;
                    page?: number;
                    pageSize?: number;
                    q?: string;
                    sort?: string;
                    type?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RegistrySearchResult"];
                        "text/json": components["schemas"]["RegistrySearchResult"];
                        "text/plain": components["schemas"]["RegistrySearchResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/registry/uninstall": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["RegistryUninstallRequest"];
                    "application/json": components["schemas"]["RegistryUninstallRequest"];
                    "text/json": components["schemas"]["RegistryUninstallRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RegistryUninstallResult"];
                        "text/json": components["schemas"]["RegistryUninstallResult"];
                        "text/plain": components["schemas"]["RegistryUninstallResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Extensions/registry/updates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RegistryUpdateInfo"][];
                        "text/json": components["schemas"]["RegistryUpdateInfo"][];
                        "text/plain": components["schemas"]["RegistryUpdateInfo"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    appearanceCount?: number;
                    appearanceCount2?: number;
                    appearanceCountModifier?: string;
                    customFieldCriteria?: string;
                    detectionCount?: number;
                    detectionCount2?: number;
                    detectionCountModifier?: string;
                    direction?: components["schemas"]["SortDirection"];
                    frameSampleCount?: number;
                    frameSampleCount2?: number;
                    frameSampleCountModifier?: string;
                    hasCover?: boolean;
                    ignored?: boolean;
                    imageCount?: number;
                    imageCount2?: number;
                    imageCountModifier?: string;
                    label?: string;
                    labelModifier?: string;
                    linked?: boolean;
                    merged?: boolean;
                    mergedIntoFaceId?: number;
                    minSuggestionConfidence?: number;
                    page?: number;
                    performerId?: number;
                    performerIds?: string;
                    perPage?: number;
                    primarySourceKey?: string;
                    primarySourceKeyModifier?: string;
                    q?: string;
                    sort?: string;
                    suggestionConfidence?: number;
                    suggestionConfidence2?: number;
                    suggestionConfidenceModifier?: string;
                    topSuggestionPerformerIds?: string;
                    videoCount?: number;
                    videoCount2?: number;
                    videoCountModifier?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfFace"];
                        "text/json": components["schemas"]["PaginatedResponseOfFace"];
                        "text/plain": components["schemas"]["PaginatedResponseOfFace"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceCreate"];
                    "application/json": components["schemas"]["FaceCreate"];
                    "text/json": components["schemas"]["FaceCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceUpdate"];
                    "application/json": components["schemas"]["FaceUpdate"];
                    "text/json": components["schemas"]["FaceUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/appearances": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    sort?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfFaceAppearance"];
                        "text/json": components["schemas"]["PaginatedResponseOfFaceAppearance"];
                        "text/plain": components["schemas"]["PaginatedResponseOfFaceAppearance"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/create-performer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceCreatePerformer"];
                    "application/json": components["schemas"]["FaceCreatePerformer"];
                    "text/json": components["schemas"]["FaceCreatePerformer"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/delete-impact": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FaceDeleteImpact"];
                        "text/json": components["schemas"]["FaceDeleteImpact"];
                        "text/plain": components["schemas"]["FaceDeleteImpact"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/detections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"][];
                        "text/json": components["schemas"]["Detection"][];
                        "text/plain": components["schemas"]["Detection"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/ignore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceIgnore"];
                    "application/json": components["schemas"]["FaceIgnore"];
                    "text/json": components["schemas"]["FaceIgnore"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/faces/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceLink"];
                    "application/json": components["schemas"]["FaceLink"];
                    "text/json": components["schemas"]["FaceLink"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/merge-into": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceMerge"];
                    "application/json": components["schemas"]["FaceMerge"];
                    "text/json": components["schemas"]["FaceMerge"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/similar": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    k?: number;
                    kindFamily?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    sort?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfFaceSimilar"];
                        "text/json": components["schemas"]["PaginatedResponseOfFaceSimilar"];
                        "text/plain": components["schemas"]["PaginatedResponseOfFaceSimilar"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/suggestions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    maxResults?: number;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FaceSuggestion"][];
                        "text/json": components["schemas"]["FaceSuggestion"][];
                        "text/plain": components["schemas"]["FaceSuggestion"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/{id}/suggestions/decision": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceSuggestionDecision"];
                    "application/json": components["schemas"]["FaceSuggestionDecision"];
                    "text/json": components["schemas"]["FaceSuggestionDecision"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"];
                        "text/json": components["schemas"]["Face"];
                        "text/plain": components["schemas"]["Face"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/batch/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceBatchDelete"];
                    "application/json": components["schemas"]["FaceBatchDelete"];
                    "text/json": components["schemas"]["FaceBatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FaceBatchOperationResult"];
                        "text/json": components["schemas"]["FaceBatchOperationResult"];
                        "text/plain": components["schemas"]["FaceBatchOperationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/batch/link-top-suggestion": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FaceBatchLinkTopSuggestion"];
                    "application/json": components["schemas"]["FaceBatchLinkTopSuggestion"];
                    "text/json": components["schemas"]["FaceBatchLinkTopSuggestion"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FaceBatchOperationResult"];
                        "text/json": components["schemas"]["FaceBatchOperationResult"];
                        "text/plain": components["schemas"]["FaceBatchOperationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/review/ai-run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    completedAt?: string;
                    startedAt?: string;
                    take?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"][];
                        "text/json": components["schemas"]["Face"][];
                        "text/plain": components["schemas"]["Face"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Faces/review/unlinked": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    take?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"][];
                        "text/json": components["schemas"]["Face"][];
                        "text/plain": components["schemas"]["Face"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/files/{id}/reveal": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/files/browse": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    path?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DirectoryEntry"][];
                        "text/json": components["schemas"]["DirectoryEntry"][];
                        "text/plain": components["schemas"]["DirectoryEntry"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/files/delete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DeleteFiles"];
                    "application/json": components["schemas"]["DeleteFiles"];
                    "text/json": components["schemas"]["DeleteFiles"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/files/fingerprints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FileSetFingerprints"];
                    "application/json": components["schemas"]["FileSetFingerprints"];
                    "text/json": components["schemas"]["FileSetFingerprints"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/files/folders/{id}/reveal": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/files/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MoveFiles"];
                    "application/json": components["schemas"]["MoveFiles"];
                    "text/json": components["schemas"]["MoveFiles"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    imageId?: number;
                    organized?: boolean;
                    page?: number;
                    performerIds?: string;
                    perPage?: number;
                    q?: string;
                    rating?: number;
                    seed?: number;
                    sort?: string;
                    studioId?: number;
                    tagIds?: string;
                    title?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfGallery"];
                        "text/json": components["schemas"]["PaginatedResponseOfGallery"];
                        "text/plain": components["schemas"]["PaginatedResponseOfGallery"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GalleryCreate"];
                    "application/json": components["schemas"]["GalleryCreate"];
                    "text/json": components["schemas"]["GalleryCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Gallery"];
                        "text/json": components["schemas"]["Gallery"];
                        "text/plain": components["schemas"]["Gallery"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/{galleryId}/chapters/{chapterId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    chapterId: number;
                    galleryId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GalleryChapterUpdate"];
                    "application/json": components["schemas"]["GalleryChapterUpdate"];
                    "text/json": components["schemas"]["GalleryChapterUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GalleryChapter"];
                        "text/json": components["schemas"]["GalleryChapter"];
                        "text/plain": components["schemas"]["GalleryChapter"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    chapterId: number;
                    galleryId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Gallery"];
                        "text/json": components["schemas"]["Gallery"];
                        "text/plain": components["schemas"]["Gallery"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GalleryUpdate"];
                    "application/json": components["schemas"]["GalleryUpdate"];
                    "text/json": components["schemas"]["GalleryUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Gallery"];
                        "text/json": components["schemas"]["Gallery"];
                        "text/plain": components["schemas"]["Gallery"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/{id}/chapters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GalleryChapter"][];
                        "text/json": components["schemas"]["GalleryChapter"][];
                        "text/plain": components["schemas"]["GalleryChapter"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GalleryChapterCreate"];
                    "application/json": components["schemas"]["GalleryChapterCreate"];
                    "text/json": components["schemas"]["GalleryChapterCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GalleryChapter"];
                        "text/json": components["schemas"]["GalleryChapter"];
                        "text/plain": components["schemas"]["GalleryChapter"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/galleries/{id}/cover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GallerySetCover"];
                    "application/json": components["schemas"]["GallerySetCover"];
                    "text/json": components["schemas"]["GallerySetCover"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/{id}/cover": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/galleries/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/galleries/{id}/image/back": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/galleries/{id}/image/back/source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityImageCoverSource"];
                    "application/json": components["schemas"]["EntityImageCoverSource"];
                    "text/json": components["schemas"]["EntityImageCoverSource"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/galleries/{id}/image/source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityImageCoverSource"];
                    "application/json": components["schemas"]["EntityImageCoverSource"];
                    "text/json": components["schemas"]["EntityImageCoverSource"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/{id}/images": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GalleryAddImages"];
                    "application/json": components["schemas"]["GalleryAddImages"];
                    "text/json": components["schemas"]["GalleryAddImages"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GalleryRemoveImages"];
                    "application/json": components["schemas"]["GalleryRemoveImages"];
                    "text/json": components["schemas"]["GalleryRemoveImages"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/{id}/rescan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkGalleryUpdate"];
                    "application/json": components["schemas"]["BulkGalleryUpdate"];
                    "text/json": components["schemas"]["BulkGalleryUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Galleries/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfGalleryFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfGalleryFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfGalleryFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfGallery"];
                        "text/json": components["schemas"]["PaginatedResponseOfGallery"];
                        "text/plain": components["schemas"]["PaginatedResponseOfGallery"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    kind?: string;
                    name?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    rating?: number;
                    seed?: number;
                    sort?: string;
                    studioId?: number;
                    tagIds?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfGroup"];
                        "text/json": components["schemas"]["PaginatedResponseOfGroup"];
                        "text/plain": components["schemas"]["PaginatedResponseOfGroup"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupCreate"];
                    "application/json": components["schemas"]["GroupCreate"];
                    "text/json": components["schemas"]["GroupCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Group"];
                        "text/json": components["schemas"]["Group"];
                        "text/plain": components["schemas"]["Group"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{groupId}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GroupItem"][];
                        "text/json": components["schemas"]["GroupItem"][];
                        "text/plain": components["schemas"]["GroupItem"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupItemCreate"];
                    "application/json": components["schemas"]["GroupItemCreate"];
                    "text/json": components["schemas"]["GroupItemCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GroupItem"];
                        "text/json": components["schemas"]["GroupItem"];
                        "text/plain": components["schemas"]["GroupItem"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{groupId}/items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupItemUpdate"];
                    "application/json": components["schemas"]["GroupItemUpdate"];
                    "text/json": components["schemas"]["GroupItemUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GroupItem"];
                        "text/json": components["schemas"]["GroupItem"];
                        "text/plain": components["schemas"]["GroupItem"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{groupId}/items/from-spans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupItemsFromSpans"];
                    "application/json": components["schemas"]["GroupItemsFromSpans"];
                    "text/json": components["schemas"]["GroupItemsFromSpans"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GroupItem"][];
                        "text/json": components["schemas"]["GroupItem"][];
                        "text/plain": components["schemas"]["GroupItem"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{groupId}/items/page": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    sort?: string;
                };
                header?: never;
                path: {
                    groupId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfGroupItem"];
                        "text/json": components["schemas"]["PaginatedResponseOfGroupItem"];
                        "text/plain": components["schemas"]["PaginatedResponseOfGroupItem"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{groupId}/items/remove-hosts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupItemsRemoveHosts"];
                    "application/json": components["schemas"]["GroupItemsRemoveHosts"];
                    "text/json": components["schemas"]["GroupItemsRemoveHosts"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{groupId}/items/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupItemsReorder"];
                    "application/json": components["schemas"]["GroupItemsReorder"];
                    "text/json": components["schemas"]["GroupItemsReorder"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{groupId}/playback-manifest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    groupId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GroupPlaybackManifest"];
                        "text/json": components["schemas"]["GroupPlaybackManifest"];
                        "text/plain": components["schemas"]["GroupPlaybackManifest"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Group"];
                        "text/json": components["schemas"]["Group"];
                        "text/plain": components["schemas"]["Group"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupUpdate"];
                    "application/json": components["schemas"]["GroupUpdate"];
                    "text/json": components["schemas"]["GroupUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Group"];
                        "text/json": components["schemas"]["Group"];
                        "text/plain": components["schemas"]["Group"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/{id}/containinggroups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Group"][];
                        "text/json": components["schemas"]["Group"][];
                        "text/plain": components["schemas"]["Group"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{id}/image/back": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{id}/image/front": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/groups/{id}/image/front/source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityImageCoverSource"];
                    "application/json": components["schemas"]["EntityImageCoverSource"];
                    "text/json": components["schemas"]["EntityImageCoverSource"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/{id}/query": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupQueryUpdate"];
                    "application/json": components["schemas"]["GroupQueryUpdate"];
                    "text/json": components["schemas"]["GroupQueryUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/{id}/snapshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/{id}/subgroups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Group"][];
                        "text/json": components["schemas"]["Group"][];
                        "text/plain": components["schemas"]["Group"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["AddSubGroup"];
                    "application/json": components["schemas"]["AddSubGroup"];
                    "text/json": components["schemas"]["AddSubGroup"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/{id}/subgroups/{subGroupId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    subGroupId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/{id}/subgroups/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ReorderSubGroups"];
                    "application/json": components["schemas"]["ReorderSubGroups"];
                    "text/json": components["schemas"]["ReorderSubGroups"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkGroupUpdate"];
                    "application/json": components["schemas"]["BulkGroupUpdate"];
                    "text/json": components["schemas"]["BulkGroupUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/dynamic-sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DynamicGroupSource"][];
                        "text/json": components["schemas"]["DynamicGroupSource"][];
                        "text/plain": components["schemas"]["DynamicGroupSource"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfGroupFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfGroupFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfGroupFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfGroup"];
                        "text/json": components["schemas"]["PaginatedResponseOfGroup"];
                        "text/plain": components["schemas"]["PaginatedResponseOfGroup"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Groups/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["GroupItemsReorder"];
                    "application/json": components["schemas"]["GroupItemsReorder"];
                    "text/json": components["schemas"]["GroupItemsReorder"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Images": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    galleryId?: number;
                    ids?: string;
                    organized?: boolean;
                    page?: number;
                    performerIds?: string;
                    perPage?: number;
                    q?: string;
                    rating?: number;
                    seed?: number;
                    sort?: string;
                    studioId?: number;
                    tagIds?: string;
                    title?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfImage"];
                        "text/json": components["schemas"]["PaginatedResponseOfImage"];
                        "text/plain": components["schemas"]["PaginatedResponseOfImage"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ImageCreate"];
                    "application/json": components["schemas"]["ImageCreate"];
                    "text/json": components["schemas"]["ImageCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Image"];
                        "text/json": components["schemas"]["Image"];
                        "text/plain": components["schemas"]["Image"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Images/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Image"];
                        "text/json": components["schemas"]["Image"];
                        "text/plain": components["schemas"]["Image"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ImageUpdate"];
                    "application/json": components["schemas"]["ImageUpdate"];
                    "text/json": components["schemas"]["ImageUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Image"];
                        "text/json": components["schemas"]["Image"];
                        "text/plain": components["schemas"]["Image"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: {
                    deleteFile?: boolean;
                    deleteGenerated?: boolean;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Images/{id}/like": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": number;
                        "text/json": number;
                        "text/plain": number;
                    };
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": number;
                        "text/json": number;
                        "text/plain": number;
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Images/{id}/like/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": number;
                        "text/json": number;
                        "text/plain": number;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Images/{id}/rescan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/images/{imageId}/detections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"][];
                        "text/json": components["schemas"]["Detection"][];
                        "text/plain": components["schemas"]["Detection"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DetectionCreate"];
                    "application/json": components["schemas"]["DetectionCreate"];
                    "text/json": components["schemas"]["DetectionCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"];
                        "text/json": components["schemas"]["Detection"];
                        "text/plain": components["schemas"]["Detection"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/images/{imageId}/detections/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"];
                        "text/json": components["schemas"]["Detection"];
                        "text/plain": components["schemas"]["Detection"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DetectionUpdate"];
                    "application/json": components["schemas"]["DetectionUpdate"];
                    "text/json": components["schemas"]["DetectionUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"];
                        "text/json": components["schemas"]["Detection"];
                        "text/plain": components["schemas"]["Detection"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/images/{imageId}/faces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FaceHostFace"][];
                        "text/json": components["schemas"]["FaceHostFace"][];
                        "text/plain": components["schemas"]["FaceHostFace"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Images/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkImageUpdate"];
                    "application/json": components["schemas"]["BulkImageUpdate"];
                    "text/json": components["schemas"]["BulkImageUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Images/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfImageFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfImageFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfImageFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfImage"];
                        "text/json": components["schemas"]["PaginatedResponseOfImage"];
                        "text/plain": components["schemas"]["PaginatedResponseOfImage"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["JobInfo"][];
                        "text/json": components["schemas"]["JobInfo"][];
                        "text/plain": components["schemas"]["JobInfo"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/{jobId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    jobId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["JobInfo"];
                        "text/json": components["schemas"]["JobInfo"];
                        "text/plain": components["schemas"]["JobInfo"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    jobId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/{jobId}/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    jobId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ReorderJobRequest"];
                    "application/json": components["schemas"]["ReorderJobRequest"];
                    "text/json": components["schemas"]["ReorderJobRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/backup/latest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/clean": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: {
                    dryRun?: boolean;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/generate-image-phashes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/generate-thumbnails": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/generate-video-phashes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["JobInfo"][];
                        "text/json": components["schemas"]["JobInfo"][];
                        "text/plain": components["schemas"]["JobInfo"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Jobs/scan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: {
                    generatePreviews?: boolean;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    level?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LogEntry"][];
                        "text/json": components["schemas"]["LogEntry"][];
                        "text/plain": components["schemas"]["LogEntry"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/bookmarks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Bookmark"][];
                        "text/json": components["schemas"]["Bookmark"][];
                        "text/plain": components["schemas"]["Bookmark"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BookmarkToggle"];
                    "application/json": components["schemas"]["BookmarkToggle"];
                    "text/json": components["schemas"]["BookmarkToggle"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BookmarkState"];
                        "text/json": components["schemas"]["BookmarkState"];
                        "text/plain": components["schemas"]["BookmarkState"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/me/bookmarks/batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BookmarkBatchRequest"];
                    "application/json": components["schemas"]["BookmarkBatchRequest"];
                    "text/json": components["schemas"]["BookmarkBatchRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BookmarkState"][];
                        "text/json": components["schemas"]["BookmarkState"][];
                        "text/plain": components["schemas"]["BookmarkState"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/clean": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["CleanOptions"];
                    "application/json": null | components["schemas"]["CleanOptions"];
                    "text/json": null | components["schemas"]["CleanOptions"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/clean-generated": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["ExportOptions"];
                    "application/json": null | components["schemas"]["ExportOptions"];
                    "text/json": null | components["schemas"]["ExportOptions"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/generate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["GenerateOptions"];
                    "application/json": null | components["schemas"]["GenerateOptions"];
                    "text/json": null | components["schemas"]["GenerateOptions"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/identify": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["IdentifyOptions"];
                    "application/json": null | components["schemas"]["IdentifyOptions"];
                    "text/json": null | components["schemas"]["IdentifyOptions"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["ImportOptions"];
                    "application/json": null | components["schemas"]["ImportOptions"];
                    "text/json": null | components["schemas"]["ImportOptions"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/library-folders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    path?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LibraryFolder"][];
                        "text/json": components["schemas"]["LibraryFolder"][];
                        "text/plain": components["schemas"]["LibraryFolder"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/scan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["ScanOptions"];
                    "application/json": null | components["schemas"]["ScanOptions"];
                    "text/json": null | components["schemas"]["ScanOptions"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/metadata/sync-fingerprints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["SyncFingerprintsOptions"];
                    "application/json": null | components["schemas"]["SyncFingerprintsOptions"];
                    "text/json": null | components["schemas"]["SyncFingerprintsOptions"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    favorite?: boolean;
                    name?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    rating?: number;
                    seed?: number;
                    sort?: string;
                    studioId?: number;
                    tagIds?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfPerformer"];
                        "text/json": components["schemas"]["PaginatedResponseOfPerformer"];
                        "text/plain": components["schemas"]["PaginatedResponseOfPerformer"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PerformerCreate"];
                    "application/json": components["schemas"]["PerformerCreate"];
                    "text/json": components["schemas"]["PerformerCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PerformerUpdate"];
                    "application/json": components["schemas"]["PerformerUpdate"];
                    "text/json": components["schemas"]["PerformerUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/appears-with": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    sort?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfPerformer"];
                        "text/json": components["schemas"]["PaginatedResponseOfPerformer"];
                        "text/plain": components["schemas"]["PaginatedResponseOfPerformer"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/apply-scraped": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PerformerApplyScrapedRequest"];
                    "application/json": components["schemas"]["PerformerApplyScrapedRequest"];
                    "text/json": components["schemas"]["PerformerApplyScrapedRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    sort?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfGroup"];
                        "text/json": components["schemas"]["PaginatedResponseOfGroup"];
                        "text/plain": components["schemas"]["PaginatedResponseOfGroup"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/performers/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/performers/{id}/image/source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityImageCoverSource"];
                    "application/json": components["schemas"]["EntityImageCoverSource"];
                    "text/json": components["schemas"]["EntityImageCoverSource"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/metadata-server/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerPerformerImportRequest"];
                    "application/json": components["schemas"]["MetadataServerPerformerImportRequest"];
                    "text/json": components["schemas"]["MetadataServerPerformerImportRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/metadata-server/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    endpoint?: string;
                    term?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerPerformerMatch"][];
                        "text/json": components["schemas"]["MetadataServerPerformerMatch"][];
                        "text/plain": components["schemas"]["MetadataServerPerformerMatch"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/metadata-server/submit-draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerEndpoint"];
                    "application/json": components["schemas"]["MetadataServerEndpoint"];
                    "text/json": components["schemas"]["MetadataServerEndpoint"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/scrape": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PerformerScrapeRequest"];
                    "application/json": components["schemas"]["PerformerScrapeRequest"];
                    "text/json": components["schemas"]["PerformerScrapeRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/scrape-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PerformerScrapeRequest"];
                    "application/json": components["schemas"]["PerformerScrapeRequest"];
                    "text/json": components["schemas"]["PerformerScrapeRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PerformerScrapePreview"];
                        "text/json": components["schemas"]["PerformerScrapePreview"];
                        "text/plain": components["schemas"]["PerformerScrapePreview"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/{id}/scrape-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PerformerScrapeUrlRequest"];
                    "application/json": components["schemas"]["PerformerScrapeUrlRequest"];
                    "text/json": components["schemas"]["PerformerScrapeUrlRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/performers/{performerId}/faces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    performerId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Face"][];
                        "text/json": components["schemas"]["Face"][];
                        "text/plain": components["schemas"]["Face"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkPerformerUpdate"];
                    "application/json": components["schemas"]["BulkPerformerUpdate"];
                    "text/json": components["schemas"]["BulkPerformerUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfPerformerFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfPerformerFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfPerformerFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfPerformer"];
                        "text/json": components["schemas"]["PaginatedResponseOfPerformer"];
                        "text/plain": components["schemas"]["PaginatedResponseOfPerformer"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PerformerMerge"];
                    "application/json": components["schemas"]["PerformerMerge"];
                    "text/json": components["schemas"]["PerformerMerge"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Performer"];
                        "text/json": components["schemas"]["Performer"];
                        "text/plain": components["schemas"]["Performer"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/metadata-server/batch-tag": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerPerformerBatchTagRequest"];
                    "application/json": components["schemas"]["MetadataServerPerformerBatchTagRequest"];
                    "text/json": components["schemas"]["MetadataServerPerformerBatchTagRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Performers/metadata-server/find-by-ids": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "application/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "text/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerPerformerMatch"][];
                        "text/json": components["schemas"]["MetadataServerPerformerMatch"][];
                        "text/plain": components["schemas"]["MetadataServerPerformerMatch"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/playback/intervals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PlaybackIntervalsRequest"];
                    "application/json": components["schemas"]["PlaybackIntervalsRequest"];
                    "text/json": components["schemas"]["PlaybackIntervalsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Plugins": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Plugin"][];
                        "text/json": components["schemas"]["Plugin"][];
                        "text/plain": components["schemas"]["Plugin"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Plugins/{pluginId}/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    pluginId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": Record<string, never>;
                        "text/json": Record<string, never>;
                        "text/plain": Record<string, never>;
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    pluginId: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": Record<string, never>;
                    "application/json": Record<string, never>;
                    "text/json": Record<string, never>;
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Plugins/reload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Plugins/run-task": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["RunPluginTask"];
                    "application/json": components["schemas"]["RunPluginTask"];
                    "text/json": components["schemas"]["RunPluginTask"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Plugins/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PluginSettings"];
                    "application/json": components["schemas"]["PluginSettings"];
                    "text/json": components["schemas"]["PluginSettings"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Plugins/tasks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PluginTask"][];
                        "text/json": components["schemas"]["PluginTask"][];
                        "text/plain": components["schemas"]["PluginTask"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateRoleRequest"];
                    "application/json": components["schemas"]["CreateRoleRequest"];
                    "text/json": components["schemas"]["CreateRoleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Roles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["UpdateRoleRequest"];
                    "application/json": components["schemas"]["UpdateRoleRequest"];
                    "text/json": components["schemas"]["UpdateRoleRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Roles/permissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/SavedFilters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    mode?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SavedFilter"][];
                        "text/json": components["schemas"]["SavedFilter"][];
                        "text/plain": components["schemas"]["SavedFilter"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SavedFilterCreate"];
                    "application/json": components["schemas"]["SavedFilterCreate"];
                    "text/json": components["schemas"]["SavedFilterCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SavedFilter"];
                        "text/json": components["schemas"]["SavedFilter"];
                        "text/plain": components["schemas"]["SavedFilter"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/SavedFilters/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SavedFilter"];
                        "text/json": components["schemas"]["SavedFilter"];
                        "text/plain": components["schemas"]["SavedFilter"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SavedFilterUpdate"];
                    "application/json": components["schemas"]["SavedFilterUpdate"];
                    "text/json": components["schemas"]["SavedFilterUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SavedFilter"];
                        "text/json": components["schemas"]["SavedFilter"];
                        "text/plain": components["schemas"]["SavedFilter"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/scrape-attempts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    entityId?: number;
                    entityType?: string;
                    limit?: number;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScrapeAttempt"][];
                        "text/json": components["schemas"]["ScrapeAttempt"][];
                        "text/plain": components["schemas"]["ScrapeAttempt"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateScrapeAttempt"];
                    "application/json": components["schemas"]["CreateScrapeAttempt"];
                    "text/json": components["schemas"]["CreateScrapeAttempt"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScrapeAttempt"];
                        "text/json": components["schemas"]["ScrapeAttempt"];
                        "text/plain": components["schemas"]["ScrapeAttempt"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/scrape-attempts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScrapeAttempt"];
                        "text/json": components["schemas"]["ScrapeAttempt"];
                        "text/plain": components["schemas"]["ScrapeAttempt"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/scrape-attempts/{id}/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ApplyVideoScrapeAttempt"];
                    "application/json": components["schemas"]["ApplyVideoScrapeAttempt"];
                    "text/json": components["schemas"]["ApplyVideoScrapeAttempt"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScrapeAttempt"];
                        "text/json": components["schemas"]["ScrapeAttempt"];
                        "text/plain": components["schemas"]["ScrapeAttempt"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/scrape-attempts/resolve-relations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ResolveScrapeRelationsRequest"];
                    "application/json": components["schemas"]["ResolveScrapeRelationsRequest"];
                    "text/json": components["schemas"]["ResolveScrapeRelationsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ResolveScrapeRelationsResult"];
                        "text/json": components["schemas"]["ResolveScrapeRelationsResult"];
                        "text/plain": components["schemas"]["ResolveScrapeRelationsResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segment-display-profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayProfile"][];
                        "text/json": components["schemas"]["SegmentDisplayProfile"][];
                        "text/plain": components["schemas"]["SegmentDisplayProfile"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentDisplayProfileCreate"];
                    "application/json": components["schemas"]["SegmentDisplayProfileCreate"];
                    "text/json": components["schemas"]["SegmentDisplayProfileCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/plain": components["schemas"]["SegmentDisplayProfile"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segment-display-profiles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/plain": components["schemas"]["SegmentDisplayProfile"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentDisplayProfileUpdate"];
                    "application/json": components["schemas"]["SegmentDisplayProfileUpdate"];
                    "text/json": components["schemas"]["SegmentDisplayProfileUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/plain": components["schemas"]["SegmentDisplayProfile"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segment-display-profiles/{id}/default": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/json": components["schemas"]["SegmentDisplayProfile"];
                        "text/plain": components["schemas"]["SegmentDisplayProfile"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segment-display-profiles/{profileId}/rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    profileId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayRule"][];
                        "text/json": components["schemas"]["SegmentDisplayRule"][];
                        "text/plain": components["schemas"]["SegmentDisplayRule"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    profileId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentDisplayRuleCreate"];
                    "application/json": components["schemas"]["SegmentDisplayRuleCreate"];
                    "text/json": components["schemas"]["SegmentDisplayRuleCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayRule"];
                        "text/json": components["schemas"]["SegmentDisplayRule"];
                        "text/plain": components["schemas"]["SegmentDisplayRule"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segment-display-profiles/{profileId}/rules/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    profileId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentDisplayRuleUpdate"];
                    "application/json": components["schemas"]["SegmentDisplayRuleUpdate"];
                    "text/json": components["schemas"]["SegmentDisplayRuleUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDisplayRule"];
                        "text/json": components["schemas"]["SegmentDisplayRule"];
                        "text/plain": components["schemas"]["SegmentDisplayRule"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    profileId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segment-display-profiles/{profileId}/rules/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    profileId: number;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["SegmentDisplayRuleCreate"][];
                    "application/json": null | components["schemas"]["SegmentDisplayRuleCreate"][];
                    "text/json": null | components["schemas"]["SegmentDisplayRuleCreate"][];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segment-display-profiles/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentDisplayProfilePreviewRequest"];
                    "application/json": components["schemas"]["SegmentDisplayProfilePreviewRequest"];
                    "text/json": components["schemas"]["SegmentDisplayProfilePreviewRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ResolvedSpanList"];
                        "text/json": components["schemas"]["ResolvedSpanList"];
                        "text/plain": components["schemas"]["ResolvedSpanList"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Segments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    colorHint?: string;
                    colorHintModifier?: string;
                    confidence?: number;
                    confidence2?: number;
                    confidenceModifier?: string;
                    createdAt?: string;
                    createdAt2?: string;
                    createdAtModifier?: string;
                    direction?: string;
                    durationModifier?: string;
                    durationSec?: number;
                    durationSec2?: number;
                    endSec?: number;
                    endSec2?: number;
                    endSecModifier?: string;
                    excludeVideoIds?: string;
                    hasImage?: boolean;
                    hasPayload?: boolean;
                    hostType?: string;
                    ids?: string;
                    kind?: string;
                    minConfidence?: number;
                    minDurationSec?: number;
                    page?: number;
                    performerIds?: string;
                    perPage?: number;
                    q?: string;
                    refIds?: string;
                    seed?: number;
                    sort?: string;
                    sourceCategory?: string;
                    sourceKey?: string;
                    sourceRunId?: string;
                    sourceRunIdModifier?: string;
                    startSec?: number;
                    startSec2?: number;
                    startSecModifier?: string;
                    tagDepth?: number;
                    tagged?: boolean;
                    tagId?: number;
                    tagIds?: string;
                    title?: string;
                    titleModifier?: string;
                    updatedAt?: string;
                    updatedAt2?: string;
                    updatedAtModifier?: string;
                    videoId?: number;
                    videoIds?: string;
                    videoTitle?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfSegmentRecord"];
                        "text/json": components["schemas"]["PaginatedResponseOfSegmentRecord"];
                        "text/plain": components["schemas"]["PaginatedResponseOfSegmentRecord"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Segments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentRecord"];
                        "text/json": components["schemas"]["SegmentRecord"];
                        "text/plain": components["schemas"]["SegmentRecord"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segments/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/segments/{id}/image/from-frame": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["GenerateScreenshot"];
                    "application/json": null | components["schemas"]["GenerateScreenshot"];
                    "text/json": null | components["schemas"]["GenerateScreenshot"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Segments/bulk/remove-tag": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentTagBulkRemoveRequest"];
                    "application/json": components["schemas"]["SegmentTagBulkRemoveRequest"];
                    "text/json": components["schemas"]["SegmentTagBulkRemoveRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Segments/kinds/distinct": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDistinctValue"][];
                        "text/json": components["schemas"]["SegmentDistinctValue"][];
                        "text/plain": components["schemas"]["SegmentDistinctValue"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Segments/source-keys/distinct": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentDistinctValue"][];
                        "text/json": components["schemas"]["SegmentDistinctValue"][];
                        "text/plain": components["schemas"]["SegmentDistinctValue"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Segments/spans/count": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentSpanSearchRequest"];
                    "application/json": components["schemas"]["SegmentSpanSearchRequest"];
                    "text/json": components["schemas"]["SegmentSpanSearchRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentSpanCountResponse"];
                        "text/json": components["schemas"]["SegmentSpanCountResponse"];
                        "text/plain": components["schemas"]["SegmentSpanCountResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Segments/spans/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentSpanSearchRequest"];
                    "application/json": components["schemas"]["SegmentSpanSearchRequest"];
                    "text/json": components["schemas"]["SegmentSpanSearchRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SegmentSpanSearchResponse"];
                        "text/json": components["schemas"]["SegmentSpanSearchResponse"];
                        "text/plain": components["schemas"]["SegmentSpanSearchResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/share-links": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateShareLinkRequest"];
                    "application/json": components["schemas"]["CreateShareLinkRequest"];
                    "text/json": components["schemas"]["CreateShareLinkRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/share-links/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/stash-migration/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ImportRequest"];
                    "application/json": components["schemas"]["ImportRequest"];
                    "text/json": components["schemas"]["ImportRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/stash-migration/import/{jobId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    jobId: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StashImportResult"];
                        "text/json": components["schemas"]["StashImportResult"];
                        "text/plain": components["schemas"]["StashImportResult"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/stash-migration/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["PreviewRequest"];
                    "application/json": components["schemas"]["PreviewRequest"];
                    "text/json": components["schemas"]["PreviewRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["StashPreviewResult"];
                        "text/json": components["schemas"]["StashPreviewResult"];
                        "text/plain": components["schemas"]["StashPreviewResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/detection/{detectionId}/crop": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                };
                header?: never;
                path: {
                    detectionId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/image/{imageId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/image/{imageId}/thumbnail": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                };
                header?: never;
                path: {
                    imageId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/caption/{captionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    captionId: number;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/captions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/hls/{profile}.m3u8": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    profile: string;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/hls/master.m3u8": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/hls/segment/{segment}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    segment: string;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/preview/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/resolutions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/screenshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    seconds?: number;
                };
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/segment-preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    seconds?: number;
                };
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/sprite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/transcode": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    resolution?: string;
                    start?: number;
                };
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Stream/video/{videoId}/vtt/thumbs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    favorite?: boolean;
                    name?: string;
                    page?: number;
                    parentId?: number;
                    perPage?: number;
                    q?: string;
                    seed?: number;
                    sort?: string;
                    tagIds?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfStudio"];
                        "text/json": components["schemas"]["PaginatedResponseOfStudio"];
                        "text/plain": components["schemas"]["PaginatedResponseOfStudio"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["StudioCreate"];
                    "application/json": components["schemas"]["StudioCreate"];
                    "text/json": components["schemas"]["StudioCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Studio"];
                        "text/json": components["schemas"]["Studio"];
                        "text/plain": components["schemas"]["Studio"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    depth?: number;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Studio"];
                        "text/json": components["schemas"]["Studio"];
                        "text/plain": components["schemas"]["Studio"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["StudioUpdate"];
                    "application/json": components["schemas"]["StudioUpdate"];
                    "text/json": components["schemas"]["StudioUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Studio"];
                        "text/json": components["schemas"]["Studio"];
                        "text/plain": components["schemas"]["Studio"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/studios/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/studios/{id}/image/source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityImageCoverSource"];
                    "application/json": components["schemas"]["EntityImageCoverSource"];
                    "text/json": components["schemas"]["EntityImageCoverSource"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/{id}/metadata-server/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerStudioImportRequest"];
                    "application/json": components["schemas"]["MetadataServerStudioImportRequest"];
                    "text/json": components["schemas"]["MetadataServerStudioImportRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Studio"];
                        "text/json": components["schemas"]["Studio"];
                        "text/plain": components["schemas"]["Studio"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/{id}/metadata-server/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    endpoint?: string;
                    term?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerStudioMatch"][];
                        "text/json": components["schemas"]["MetadataServerStudioMatch"][];
                        "text/plain": components["schemas"]["MetadataServerStudioMatch"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/{id}/metadata-server/submit-draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerEndpoint"];
                    "application/json": components["schemas"]["MetadataServerEndpoint"];
                    "text/json": components["schemas"]["MetadataServerEndpoint"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkStudioUpdate"];
                    "application/json": components["schemas"]["BulkStudioUpdate"];
                    "text/json": components["schemas"]["BulkStudioUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfStudioFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfStudioFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfStudioFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfStudio"];
                        "text/json": components["schemas"]["PaginatedResponseOfStudio"];
                        "text/plain": components["schemas"]["PaginatedResponseOfStudio"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["StudioMerge"];
                    "application/json": components["schemas"]["StudioMerge"];
                    "text/json": components["schemas"]["StudioMerge"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Studio"];
                        "text/json": components["schemas"]["Studio"];
                        "text/plain": components["schemas"]["Studio"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/metadata-server/batch-tag": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerStudioBatchTagRequest"];
                    "application/json": components["schemas"]["MetadataServerStudioBatchTagRequest"];
                    "text/json": components["schemas"]["MetadataServerStudioBatchTagRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Studios/metadata-server/find-by-ids": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "application/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "text/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerStudioMatch"][];
                        "text/json": components["schemas"]["MetadataServerStudioMatch"][];
                        "text/plain": components["schemas"]["MetadataServerStudioMatch"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/config": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CoveConfig"];
                        "text/json": components["schemas"]["CoveConfig"];
                        "text/plain": components["schemas"]["CoveConfig"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CoveConfig"];
                    "application/json": components["schemas"]["CoveConfig"];
                    "text/json": components["schemas"]["CoveConfig"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CoveConfig"];
                        "text/json": components["schemas"]["CoveConfig"];
                        "text/plain": components["schemas"]["CoveConfig"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/config/ui": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": Record<string, never>;
                    "application/json": Record<string, never>;
                    "text/json": Record<string, never>;
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/config/ui/{key}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    key: string;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | unknown;
                    "application/json": null | unknown;
                    "text/json": null | unknown;
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/downloaders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DownloaderDescriptor"][];
                        "text/json": components["schemas"]["DownloaderDescriptor"][];
                        "text/plain": components["schemas"]["DownloaderDescriptor"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/downloaders/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DownloaderStartRequest"];
                    "application/json": components["schemas"]["DownloaderStartRequest"];
                    "text/json": components["schemas"]["DownloaderStartRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/downloaders/download-batch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DownloaderBatchStartRequest"];
                    "application/json": components["schemas"]["DownloaderBatchStartRequest"];
                    "text/json": components["schemas"]["DownloaderBatchStartRequest"];
                };
            };
            responses: {
                /** @description Accepted */
                202: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DownloaderBatchStartResponse"];
                        "text/json": components["schemas"]["DownloaderBatchStartResponse"];
                        "text/plain": components["schemas"]["DownloaderBatchStartResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/downloaders/match": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DownloaderMatchRequest"];
                    "application/json": components["schemas"]["DownloaderMatchRequest"];
                    "text/json": components["schemas"]["DownloaderMatchRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DownloaderMatch"][];
                        "text/json": components["schemas"]["DownloaderMatch"][];
                        "text/plain": components["schemas"]["DownloaderMatch"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/downloaders/preflight": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DownloaderPreflightRequest"];
                    "application/json": components["schemas"]["DownloaderPreflightRequest"];
                    "text/json": components["schemas"]["DownloaderPreflightRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DownloaderPreflightResponse"];
                        "text/json": components["schemas"]["DownloaderPreflightResponse"];
                        "text/plain": components["schemas"]["DownloaderPreflightResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/ffmpeg-capabilities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    refresh?: boolean;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FfmpegCapabilities"];
                        "text/json": components["schemas"]["FfmpegCapabilities"];
                        "text/plain": components["schemas"]["FfmpegCapabilities"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/log-level": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SetLogLevelRequest"];
                    "application/json": components["schemas"]["SetLogLevelRequest"];
                    "text/json": components["schemas"]["SetLogLevelRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        trace?: never;
    };
    "/api/System/maintenance/recompute-derived-counts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["RecomputeDerivedCountsResult"];
                        "text/json": components["schemas"]["RecomputeDerivedCountsResult"];
                        "text/plain": components["schemas"]["RecomputeDerivedCountsResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/metadata-servers/validate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServer"];
                    "application/json": components["schemas"]["MetadataServer"];
                    "text/json": components["schemas"]["MetadataServer"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerValidationResult"];
                        "text/json": components["schemas"]["MetadataServerValidationResult"];
                        "text/plain": components["schemas"]["MetadataServerValidationResult"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/scrapers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScraperSummary"][];
                        "text/json": components["schemas"]["ScraperSummary"][];
                        "text/plain": components["schemas"]["ScraperSummary"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/scrapers/match-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ScraperMatchUrlRequest"];
                    "application/json": components["schemas"]["ScraperMatchUrlRequest"];
                    "text/json": components["schemas"]["ScraperMatchUrlRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScraperSummary"][];
                        "text/json": components["schemas"]["ScraperSummary"][];
                        "text/plain": components["schemas"]["ScraperSummary"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/scrapers/reload": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ScraperSummary"][];
                        "text/json": components["schemas"]["ScraperSummary"][];
                        "text/plain": components["schemas"]["ScraperSummary"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/scrapers/scrape-fragment": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ScrapeFragmentRequest"];
                    "application/json": components["schemas"]["ScrapeFragmentRequest"];
                    "text/json": components["schemas"]["ScrapeFragmentRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": Record<string, never>;
                        "text/json": Record<string, never>;
                        "text/plain": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/scrapers/scrape-name": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ScrapeNameRequest"];
                    "application/json": components["schemas"]["ScrapeNameRequest"];
                    "text/json": components["schemas"]["ScrapeNameRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": Record<string, never>[];
                        "text/json": Record<string, never>[];
                        "text/plain": Record<string, never>[];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/scrapers/scrape-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ScrapeUrlRequest"];
                    "application/json": components["schemas"]["ScrapeUrlRequest"];
                    "text/json": components["schemas"]["ScrapeUrlRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": Record<string, never>;
                        "text/json": Record<string, never>;
                        "text/plain": Record<string, never>;
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/scrapers/scrape-url-auto": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["ScraperMatchUrlRequest"];
                    "application/json": components["schemas"]["ScraperMatchUrlRequest"];
                    "text/json": components["schemas"]["ScraperMatchUrlRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/shutdown": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Stats"];
                        "text/json": components["schemas"]["Stats"];
                        "text/plain": components["schemas"]["Stats"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SystemStatus"];
                        "text/json": components["schemas"]["SystemStatus"];
                        "text/plain": components["schemas"]["SystemStatus"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/ui-assets/{fileName}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    fileName: string;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/ui/favicon": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/x-www-form-urlencoded": {
                        ContentDisposition?: string;
                        ContentType?: string;
                        FileName?: string;
                        Headers?: {
                            [key: string]: string[];
                        };
                        /** Format: int64 */
                        Length?: number;
                        Name?: string;
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/System/ui/logo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/x-www-form-urlencoded": {
                        ContentDisposition?: string;
                        ContentType?: string;
                        FileName?: string;
                        Headers?: {
                            [key: string]: string[];
                        };
                        /** Format: int64 */
                        Length?: number;
                        Name?: string;
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tagapplications": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    contextId?: number;
                    contextType?: string;
                    hostId?: number;
                    hostType?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagApplication"][];
                        "text/json": components["schemas"]["TagApplication"][];
                        "text/plain": components["schemas"]["TagApplication"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TagApplicationCreate"];
                    "application/json": components["schemas"]["TagApplicationCreate"];
                    "text/json": components["schemas"]["TagApplicationCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagApplication"];
                        "text/json": components["schemas"]["TagApplication"];
                        "text/plain": components["schemas"]["TagApplication"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tagapplications/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tagapplications/host/{hostType}/{hostId}/tag/{tagId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    hostId: number;
                    hostType: string;
                    tagId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/taggroups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagGroup"][];
                        "text/json": components["schemas"]["TagGroup"][];
                        "text/plain": components["schemas"]["TagGroup"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TagGroupCreate"];
                    "application/json": components["schemas"]["TagGroupCreate"];
                    "text/json": components["schemas"]["TagGroupCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagGroup"];
                        "text/json": components["schemas"]["TagGroup"];
                        "text/plain": components["schemas"]["TagGroup"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/taggroups/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagGroup"];
                        "text/json": components["schemas"]["TagGroup"];
                        "text/plain": components["schemas"]["TagGroup"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TagGroupUpdate"];
                    "application/json": components["schemas"]["TagGroupUpdate"];
                    "text/json": components["schemas"]["TagGroupUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagGroup"];
                        "text/json": components["schemas"]["TagGroup"];
                        "text/plain": components["schemas"]["TagGroup"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    favorite?: boolean;
                    includeCounts?: boolean;
                    name?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    rating?: number;
                    seed?: number;
                    sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfTagList"];
                        "text/json": components["schemas"]["PaginatedResponseOfTagList"];
                        "text/plain": components["schemas"]["PaginatedResponseOfTagList"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TagCreate"];
                    "application/json": components["schemas"]["TagCreate"];
                    "text/json": components["schemas"]["TagCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagDetail"];
                        "text/json": components["schemas"]["TagDetail"];
                        "text/plain": components["schemas"]["TagDetail"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    depth?: number;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagDetail"];
                        "text/json": components["schemas"]["TagDetail"];
                        "text/plain": components["schemas"]["TagDetail"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TagUpdate"];
                    "application/json": components["schemas"]["TagUpdate"];
                    "text/json": components["schemas"]["TagUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagDetail"];
                        "text/json": components["schemas"]["TagDetail"];
                        "text/plain": components["schemas"]["TagDetail"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tags/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/tags/{id}/image/source": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["EntityImageCoverSource"];
                    "application/json": components["schemas"]["EntityImageCoverSource"];
                    "text/json": components["schemas"]["EntityImageCoverSource"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/{id}/metadata-server/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerTagImportRequest"];
                    "application/json": components["schemas"]["MetadataServerTagImportRequest"];
                    "text/json": components["schemas"]["MetadataServerTagImportRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagDetail"];
                        "text/json": components["schemas"]["TagDetail"];
                        "text/plain": components["schemas"]["TagDetail"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/{id}/metadata-server/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    endpoint?: string;
                    term?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerTagMatch"][];
                        "text/json": components["schemas"]["MetadataServerTagMatch"][];
                        "text/plain": components["schemas"]["MetadataServerTagMatch"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/{id}/metadata-server/submit-draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerEndpoint"];
                    "application/json": components["schemas"]["MetadataServerEndpoint"];
                    "text/json": components["schemas"]["MetadataServerEndpoint"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/{id}/segments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    count?: number;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagSegmentWall"][];
                        "text/json": components["schemas"]["TagSegmentWall"][];
                        "text/plain": components["schemas"]["TagSegmentWall"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkTagUpdate"];
                    "application/json": components["schemas"]["BulkTagUpdate"];
                    "text/json": components["schemas"]["BulkTagUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfTagFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfTagFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfTagFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfTagList"];
                        "text/json": components["schemas"]["PaginatedResponseOfTagList"];
                        "text/plain": components["schemas"]["PaginatedResponseOfTagList"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/graph": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfTagFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfTagFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfTagFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagGraphResponse"];
                        "text/json": components["schemas"]["TagGraphResponse"];
                        "text/plain": components["schemas"]["TagGraphResponse"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TagMerge"];
                    "application/json": components["schemas"]["TagMerge"];
                    "text/json": components["schemas"]["TagMerge"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TagDetail"];
                        "text/json": components["schemas"]["TagDetail"];
                        "text/plain": components["schemas"]["TagDetail"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/metadata-server/batch-tag": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerTagBatchTagRequest"];
                    "application/json": components["schemas"]["MetadataServerTagBatchTagRequest"];
                    "text/json": components["schemas"]["MetadataServerTagBatchTagRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/metadata-server/find-by-ids": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "application/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "text/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerTagMatch"][];
                        "text/json": components["schemas"]["MetadataServerTagMatch"][];
                        "text/plain": components["schemas"]["MetadataServerTagMatch"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Tags/segment-titles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    q?: string;
                    sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": string[];
                        "text/json": string[];
                        "text/plain": string[];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    page?: number;
                    perPage?: number;
                    q?: string;
                    seed?: number;
                    sort?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfTextDocument"];
                        "text/json": components["schemas"]["PaginatedResponseOfTextDocument"];
                        "text/plain": components["schemas"]["PaginatedResponseOfTextDocument"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TextDocumentCreate"];
                    "application/json": components["schemas"]["TextDocumentCreate"];
                    "text/json": components["schemas"]["TextDocumentCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TextDocument"];
                        "text/json": components["schemas"]["TextDocument"];
                        "text/plain": components["schemas"]["TextDocument"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TextDocument"];
                        "text/json": components["schemas"]["TextDocument"];
                        "text/plain": components["schemas"]["TextDocument"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["TextDocumentUpdate"];
                    "application/json": components["schemas"]["TextDocumentUpdate"];
                    "text/json": components["schemas"]["TextDocumentUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TextDocument"];
                        "text/json": components["schemas"]["TextDocument"];
                        "text/plain": components["schemas"]["TextDocument"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: {
                    deleteFile?: boolean;
                    deleteGenerated?: boolean;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts/{id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TextContent"];
                        "text/json": components["schemas"]["TextContent"];
                        "text/plain": components["schemas"]["TextContent"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts/{id}/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/texts/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts/{id}/rescan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkTextDocumentUpdate"];
                    "application/json": components["schemas"]["BulkTextDocumentUpdate"];
                    "text/json": components["schemas"]["BulkTextDocumentUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfTextDocumentFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfTextDocumentFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfTextDocumentFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfTextDocument"];
                        "text/json": components["schemas"]["PaginatedResponseOfTextDocument"];
                        "text/plain": components["schemas"]["PaginatedResponseOfTextDocument"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Texts/from-file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["FileBackedCreate"];
                    "application/json": null | components["schemas"]["FileBackedCreate"];
                    "text/json": null | components["schemas"]["FileBackedCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TextDocument"];
                        "text/json": components["schemas"]["TextDocument"];
                        "text/plain": components["schemas"]["TextDocument"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateUserRequest"];
                    "application/json": components["schemas"]["CreateUserRequest"];
                    "text/json": components["schemas"]["CreateUserRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Users/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["UpdateUserRequest"];
                    "application/json": components["schemas"]["UpdateUserRequest"];
                    "text/json": components["schemas"]["UpdateUserRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Users/{id}/invite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Users/{id}/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["AdminPasswordRequest"];
                    "application/json": components["schemas"]["AdminPasswordRequest"];
                    "text/json": components["schemas"]["AdminPasswordRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Users/{id}/roles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SetRolesRequest"];
                    "application/json": components["schemas"]["SetRolesRequest"];
                    "text/json": components["schemas"]["SetRolesRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Users/{id}/unlock": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Users/invite": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["CreateInviteRequest"];
                    "application/json": components["schemas"]["CreateInviteRequest"];
                    "text/json": components["schemas"]["CreateInviteRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    galleryId?: number;
                    groupId?: number;
                    ids?: string;
                    organized?: boolean;
                    page?: number;
                    performerIds?: string;
                    perPage?: number;
                    q?: string;
                    rating?: number;
                    seed?: number;
                    sort?: string;
                    studioId?: number;
                    tagIds?: string;
                    title?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfVideo"];
                        "text/json": components["schemas"]["PaginatedResponseOfVideo"];
                        "text/plain": components["schemas"]["PaginatedResponseOfVideo"];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["VideoCreate"];
                    "application/json": components["schemas"]["VideoCreate"];
                    "text/json": components["schemas"]["VideoCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"];
                        "text/json": components["schemas"]["Video"];
                        "text/plain": components["schemas"]["Video"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"];
                        "text/json": components["schemas"]["Video"];
                        "text/plain": components["schemas"]["Video"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["VideoUpdate"];
                    "application/json": components["schemas"]["VideoUpdate"];
                    "text/json": components["schemas"]["VideoUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"];
                        "text/json": components["schemas"]["Video"];
                        "text/plain": components["schemas"]["Video"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: {
                    deleteFile?: boolean;
                    deleteGenerated?: boolean;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/activity/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/assign-file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["VideoAssignFile"];
                    "application/json": components["schemas"]["VideoAssignFile"];
                    "text/json": components["schemas"]["VideoAssignFile"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/cover/from-frame": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["GenerateScreenshot"];
                    "application/json": null | components["schemas"]["GenerateScreenshot"];
                    "text/json": null | components["schemas"]["GenerateScreenshot"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/generate-screenshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["GenerateScreenshot"];
                    "application/json": null | components["schemas"]["GenerateScreenshot"];
                    "text/json": null | components["schemas"]["GenerateScreenshot"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["VideoHistory"];
                        "text/json": components["schemas"]["VideoHistory"];
                        "text/plain": components["schemas"]["VideoHistory"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    max?: number;
                    v?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "multipart/form-data": {
                        file?: components["schemas"]["IFormFile"];
                    };
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/like": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": number;
                        "text/json": number;
                        "text/plain": number;
                    };
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/like/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/metadata-server/import": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerVideoImportRequest"];
                    "application/json": components["schemas"]["MetadataServerVideoImportRequest"];
                    "text/json": components["schemas"]["MetadataServerVideoImportRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"];
                        "text/json": components["schemas"]["Video"];
                        "text/plain": components["schemas"]["Video"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/metadata-server/search": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    endpoint?: string;
                    term?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerVideoMatch"][];
                        "text/json": components["schemas"]["MetadataServerVideoMatch"][];
                        "text/plain": components["schemas"]["MetadataServerVideoMatch"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/metadata-server/submit-draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerEndpoint"];
                    "application/json": components["schemas"]["MetadataServerEndpoint"];
                    "text/json": components["schemas"]["MetadataServerEndpoint"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/metadata-server/submit-fingerprints": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerEndpoint"];
                    "application/json": components["schemas"]["MetadataServerEndpoint"];
                    "text/json": components["schemas"]["MetadataServerEndpoint"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/play": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/play/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/rating": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["VideoRating"];
                    "application/json": components["schemas"]["VideoRating"];
                    "text/json": components["schemas"]["VideoRating"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": number;
                        "text/json": number;
                        "text/plain": number;
                    };
                };
            };
        };
        delete: {
            parameters: {
                query?: {
                    aspect?: string;
                };
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/ratings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EntityRatings"];
                        "text/json": components["schemas"]["EntityRatings"];
                        "text/plain": components["schemas"]["EntityRatings"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/{id}/rescan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/detections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"][];
                        "text/json": components["schemas"]["Detection"][];
                        "text/plain": components["schemas"]["Detection"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DetectionCreate"];
                    "application/json": components["schemas"]["DetectionCreate"];
                    "text/json": components["schemas"]["DetectionCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"];
                        "text/json": components["schemas"]["Detection"];
                        "text/plain": components["schemas"]["Detection"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/detections/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"];
                        "text/json": components["schemas"]["Detection"];
                        "text/plain": components["schemas"]["Detection"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["DetectionUpdate"];
                    "application/json": components["schemas"]["DetectionUpdate"];
                    "text/json": components["schemas"]["DetectionUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Detection"];
                        "text/json": components["schemas"]["Detection"];
                        "text/plain": components["schemas"]["Detection"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/faces": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FaceHostFace"][];
                        "text/json": components["schemas"]["FaceHostFace"][];
                        "text/plain": components["schemas"]["FaceHostFace"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/segments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Segment"][];
                        "text/json": components["schemas"]["Segment"][];
                        "text/plain": components["schemas"]["Segment"][];
                    };
                };
            };
        };
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentCreate"];
                    "application/json": components["schemas"]["SegmentCreate"];
                    "text/json": components["schemas"]["SegmentCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Segment"];
                        "text/json": components["schemas"]["Segment"];
                        "text/plain": components["schemas"]["Segment"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/segments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Segment"];
                        "text/json": components["schemas"]["Segment"];
                        "text/plain": components["schemas"]["Segment"];
                    };
                };
            };
        };
        put: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentUpdate"];
                    "application/json": components["schemas"]["SegmentUpdate"];
                    "text/json": components["schemas"]["SegmentUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Segment"];
                        "text/json": components["schemas"]["Segment"];
                        "text/plain": components["schemas"]["Segment"];
                    };
                };
            };
        };
        post?: never;
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    id: number;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/segments/spans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    profile?: number;
                };
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["VideoResolvedSpans"];
                        "text/json": components["schemas"]["VideoResolvedSpans"];
                        "text/plain": components["schemas"]["VideoResolvedSpans"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/segments/spans/query": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path: {
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["SegmentSpanQueryRequest"];
                    "application/json": components["schemas"]["SegmentSpanQueryRequest"];
                    "text/json": components["schemas"]["SegmentSpanQueryRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ResolvedSpanList"];
                        "text/json": components["schemas"]["ResolvedSpanList"];
                        "text/plain": components["schemas"]["ResolvedSpanList"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/videos/{videoId}/spans/{spanKey}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    profile?: number;
                };
                header?: never;
                path: {
                    spanKey: string;
                    videoId: number;
                };
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ResolvedSpanDetail"];
                        "text/json": components["schemas"]["ResolvedSpanDetail"];
                        "text/plain": components["schemas"]["ResolvedSpanDetail"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/bulk": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BulkVideoUpdate"];
                    "application/json": components["schemas"]["BulkVideoUpdate"];
                    "text/json": components["schemas"]["BulkVideoUpdate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/destroy": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["BatchDelete"];
                    "application/json": components["schemas"]["BatchDelete"];
                    "text/json": components["schemas"]["BatchDelete"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/duplicates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    distance?: number;
                    durationDiff?: number;
                    matchType?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"][][];
                        "text/json": components["schemas"]["Video"][][];
                        "text/plain": components["schemas"]["Video"][][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/find": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["FilteredQueryRequestOfVideoFilter"];
                    "application/json": components["schemas"]["FilteredQueryRequestOfVideoFilter"];
                    "text/json": components["schemas"]["FilteredQueryRequestOfVideoFilter"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/from-file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/*+json": null | components["schemas"]["FileBackedCreate"];
                    "application/json": null | components["schemas"]["FileBackedCreate"];
                    "text/json": null | components["schemas"]["FileBackedCreate"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"];
                        "text/json": components["schemas"]["Video"];
                        "text/plain": components["schemas"]["Video"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/merge": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["VideoMerge"];
                    "application/json": components["schemas"]["VideoMerge"];
                    "text/json": components["schemas"]["VideoMerge"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"];
                        "text/json": components["schemas"]["Video"];
                        "text/plain": components["schemas"]["Video"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/metadata-server/find-by-ids": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody: {
                content: {
                    "application/*+json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "application/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                    "text/json": components["schemas"]["MetadataServerFindByIdsRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MetadataServerVideoMatch"][];
                        "text/json": components["schemas"]["MetadataServerVideoMatch"][];
                        "text/plain": components["schemas"]["MetadataServerVideoMatch"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/wall": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    count?: number;
                    q?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Video"][];
                        "text/json": components["schemas"]["Video"][];
                        "text/plain": components["schemas"]["Video"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/Videos/with-compilations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: {
                    direction?: string;
                    galleryId?: number;
                    groupId?: number;
                    isVr?: boolean;
                    organized?: boolean;
                    page?: number;
                    performerIds?: string;
                    perPage?: number;
                    q?: string;
                    rating?: number;
                    seed?: number;
                    sort?: string;
                    studioId?: number;
                    tagIds?: string;
                    title?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PaginatedResponseOfVideoListEntry"];
                        "text/json": components["schemas"]["PaginatedResponseOfVideoListEntry"];
                        "text/plain": components["schemas"]["PaginatedResponseOfVideoListEntry"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AddSubGroup: {
            description?: string;
            /** Format: int32 */
            orderIndex?: number;
            /** Format: int32 */
            subGroupId: number;
        };
        AdminPasswordRequest: {
            newPassword: string;
        };
        /** @enum {string} */
        AffinityHostType: "video" | "image" | "performer" | "face" | "tag" | "studio" | "gallery" | "group" | "audio" | "text" | "segment";
        AiDataPurgeRequest: {
            /** @default false */
            dryRun: boolean;
            /** Format: int32 */
            hostId?: number;
            hostType?: string;
            kinds?: string[];
            modality?: string;
            model?: string;
            sourceKey?: string;
            sourceRunId?: string;
        };
        AiDataPurgeResult: {
            removedCounts: {
                [key: string]: number;
            };
        };
        AiDataSelector: {
            /** Format: int32 */
            hostId?: number;
            hostType?: string;
            kinds?: string[];
            modality?: string;
            model?: string;
            sourceKey?: string;
            sourceRunId?: string;
        };
        AiDataSummary: {
            items: components["schemas"]["AiDataSummaryItem"][];
            /** Format: int32 */
            totalCount: number;
            totals: {
                [key: string]: number;
            };
        };
        AiDataSummaryItem: {
            /** Format: int32 */
            count: number;
            detail?: string;
            hostType: string;
            kind: string;
            model?: string;
            sourceKey: string;
            sourceRunId?: string;
        };
        AiRun: {
            /** Format: date-time */
            completedAt?: string;
            /** Format: date-time */
            createdAt: string;
            error?: string;
            /** Format: double */
            frameIntervalSec?: number;
            /** Format: int32 */
            id: number;
            jobId?: string;
            loadPolicy?: string;
            models?: null | components["schemas"]["JsonElement"];
            request?: null | components["schemas"]["JsonElement"];
            runKey: string;
            sourceKey: string;
            /** Format: date-time */
            startedAt: string;
            status: components["schemas"]["AiRunStatus"];
            summary?: null | components["schemas"]["JsonElement"];
            /** Format: int32 */
            targetId: number;
            targetType: components["schemas"]["AiRunTargetType"];
            trigger?: string;
            /** Format: date-time */
            updatedAt: string;
            vr?: boolean;
        };
        /** @enum {string} */
        AiRunStatus: "pending" | "running" | "completed" | "failed" | "cancelled";
        /** @enum {string} */
        AiRunTargetType: "video" | "image" | "performer" | "face";
        ApplyVideoScrapeAttempt: {
            collectionModes?: {
                [key: string]: string;
            };
            /** @default true */
            createMissingPerformers: boolean;
            /** @default true */
            createMissingStudio: boolean;
            /** @default true */
            createMissingTags: boolean;
            /** @default false */
            hydratePerformers: boolean;
            /** @default false */
            markOrganized: boolean;
            performerSelections?: components["schemas"]["ScrapeCollectionItemSelection"][];
            replaceFields?: string[];
            /** Format: int32 */
            selectedCandidateIndex?: number;
            tagSelections?: components["schemas"]["ScrapeCollectionItemSelection"][];
        };
        Audio: {
            code?: string;
            contextTagApplications?: components["schemas"]["TagApplication"][];
            createdAt: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /** Format: int32 */
            fileCount: number;
            files: components["schemas"]["AudioFile"][];
            groups: components["schemas"]["GroupSummary"][];
            hasVideoFiles: boolean;
            /** Format: int32 */
            id: number;
            imagePath?: string;
            /** Format: double */
            maxDuration: number;
            organized: boolean;
            performers: components["schemas"]["PerformerSummary"][];
            /** Format: int32 */
            studioId?: number;
            studioName?: string;
            tags: components["schemas"]["Tag"][];
            title?: string;
            tracks: components["schemas"]["AudioTrack"][];
            updatedAt: string;
            urls: string[];
        };
        AudioCreate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            groupIds?: components["schemas"]["VideoGroupInput"][];
            organized: boolean;
            performerIds?: number[];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        AudioFile: {
            audioCodec: string;
            basename: string;
            /** Format: int64 */
            bitRate: number;
            /** Format: int32 */
            channels?: number;
            /** Format: double */
            duration: number;
            format: string;
            hasVideoTrack: boolean;
            /** Format: int32 */
            id: number;
            path: string;
            /** Format: int32 */
            sampleRate?: number;
            /** Format: int64 */
            size: number;
        };
        AudioFilter: {
            audioCodecCriterion?: null | components["schemas"]["StringCriterion"];
            bitRateCriterion?: null | components["schemas"]["IntCriterion"];
            channelsCriterion?: null | components["schemas"]["IntCriterion"];
            codeCriterion?: null | components["schemas"]["StringCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            dateCriterion?: null | components["schemas"]["DateCriterion"];
            detailsCriterion?: null | components["schemas"]["StringCriterion"];
            durationCriterion?: null | components["schemas"]["IntCriterion"];
            fileCountCriterion?: null | components["schemas"]["IntCriterion"];
            fileModTimeCriterion?: null | components["schemas"]["TimestampCriterion"];
            fileSizeCriterion?: null | components["schemas"]["IntCriterion"];
            formatCriterion?: null | components["schemas"]["StringCriterion"];
            groupsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            hasCoverCriterion?: null | components["schemas"]["BoolCriterion"];
            hasVideoFilesCriterion?: null | components["schemas"]["BoolCriterion"];
            lastPlayedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            likeCounterCriterion?: null | components["schemas"]["IntCriterion"];
            organizedCriterion?: null | components["schemas"]["BoolCriterion"];
            pathCriterion?: null | components["schemas"]["StringCriterion"];
            performerCountCriterion?: null | components["schemas"]["IntCriterion"];
            performersCriterion?: null | components["schemas"]["MultiIdCriterion"];
            performerTagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            playCountCriterion?: null | components["schemas"]["IntCriterion"];
            playDurationCriterion?: null | components["schemas"]["IntCriterion"];
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            sampleRateCriterion?: null | components["schemas"]["IntCriterion"];
            studiosCriterion?: null | components["schemas"]["MultiIdCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            titleCriterion?: null | components["schemas"]["StringCriterion"];
            trackCountCriterion?: null | components["schemas"]["IntCriterion"];
            trackTitleCriterion?: null | components["schemas"]["StringCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
        };
        AudioTrack: {
            /** Format: double */
            endSec?: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            orderIndex: number;
            /** Format: double */
            startSec: number;
            title?: string;
        };
        AudioUpdate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            groupIds?: components["schemas"]["VideoGroupInput"][];
            organized?: boolean;
            performerIds?: number[];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        BackupResult: {
            backupPath: string;
            /** Format: int64 */
            sizeBytes: number;
            timestamp: string;
        };
        BatchDelete: {
            /** @default false */
            deleteFiles: boolean;
            /** @default false */
            deleteGenerated: boolean;
            ids: number[];
        };
        Bookmark: {
            createdAt: string;
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["AffinityHostType"];
        };
        BookmarkBatchRequest: {
            hostIds: number[];
            hostType: components["schemas"]["AffinityHostType"];
        };
        BookmarkState: {
            createdAt?: string;
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["AffinityHostType"];
            saved: boolean;
        };
        BookmarkToggle: {
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["AffinityHostType"];
            saved: boolean;
        };
        BoolCriterion: {
            value?: boolean;
        };
        BootstrapOwnerRequest: {
            password: string;
            username: string;
        };
        BulkAudioUpdate: {
            clearFields?: string[];
            code?: string;
            date?: string;
            details?: string;
            ids: number[];
            organized?: boolean;
            performerIds?: number[];
            performerMode: components["schemas"]["BulkUpdateMode"];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        BulkGalleryUpdate: {
            clearFields?: string[];
            code?: string;
            date?: string;
            details?: string;
            ids: number[];
            organized?: boolean;
            performerIds?: number[];
            performerMode: components["schemas"]["BulkUpdateMode"];
            photographer?: string;
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        BulkGroupUpdate: {
            clearFields?: string[];
            date?: string;
            description?: string;
            director?: string;
            ids: number[];
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        BulkImageUpdate: {
            clearFields?: string[];
            code?: string;
            date?: string;
            details?: string;
            galleryIds?: number[];
            galleryMode: components["schemas"]["BulkUpdateMode"];
            ids: number[];
            organized?: boolean;
            performerIds?: number[];
            performerMode: components["schemas"]["BulkUpdateMode"];
            photographer?: string;
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        BulkPerformerUpdate: {
            details?: string;
            favorite?: boolean;
            gender?: string;
            ids: number[];
            /** Format: int32 */
            rating?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        BulkStudioUpdate: {
            clearFields?: string[];
            details?: string;
            favorite?: boolean;
            ids: number[];
            organized?: boolean;
            /** Format: int32 */
            rating?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        BulkTagUpdate: {
            childIds?: number[];
            childMode: components["schemas"]["BulkUpdateMode"];
            clearFields?: string[];
            color?: string;
            description?: string;
            favorite?: boolean;
            ids: number[];
            /** Format: double */
            minOccurrencePercent?: number;
            /** Format: double */
            minOccurrenceSec?: number;
            organized?: boolean;
            parentIds?: number[];
            parentMode: components["schemas"]["BulkUpdateMode"];
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            tagGroupId?: number;
        };
        BulkTextDocumentUpdate: {
            clearFields?: string[];
            code?: string;
            date?: string;
            details?: string;
            ids: number[];
            organized?: boolean;
            performerIds?: number[];
            performerMode: components["schemas"]["BulkUpdateMode"];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        /** @enum {string} */
        BulkUpdateMode: "set" | "add" | "remove";
        BulkVideoUpdate: {
            clearFields?: string[];
            code?: string;
            date?: string;
            director?: string;
            galleryIds?: number[];
            galleryMode: components["schemas"]["BulkUpdateMode"];
            groupIds?: components["schemas"]["VideoGroupInput"][];
            groupMode: components["schemas"]["BulkUpdateMode"];
            ids: number[];
            isVr?: boolean;
            organized?: boolean;
            performerIds?: number[];
            performerMode: components["schemas"]["BulkUpdateMode"];
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            tagMode: components["schemas"]["BulkUpdateMode"];
        };
        Caption: {
            captionType: string;
            filename: string;
            /** Format: int32 */
            id: number;
            languageCode: string;
        };
        ChangePasswordRequest: {
            currentPassword: string;
            newPassword: string;
        };
        CleanOptions: {
            dryRun: boolean;
            paths?: string[];
        };
        ConfigBackupResult: {
            backupPath: string;
            /** Format: int64 */
            sizeBytes: number;
            timestamp: string;
        };
        CoveConfig: {
            audioExtensions: string[];
            cachePath?: string;
            calculateMd5: boolean;
            covePaths: components["schemas"]["CovePath"][];
            createGalleriesFromFolders: boolean;
            createImageClipsFromVideos: boolean;
            customFieldDefinitions: components["schemas"]["CustomFieldDefinition"][];
            deleteGeneratedDefault: boolean;
            disabledPlugins: string[];
            downloaderPathOverrides: components["schemas"]["DownloaderPathOverride"][];
            enableFfmpegHwAccel?: boolean;
            excludeGalleryPatterns: string[];
            excludeImagePatterns: string[];
            excludePatterns: string[];
            ffmpegInputArgs?: string;
            ffmpegOutputArgs?: string;
            ffmpegPath?: string;
            ffprobePath?: string;
            frameExtractionMode: string;
            galleryCoverRegex: string;
            galleryExtensions: string[];
            generatedPath?: string;
            hardwareAcceleration?: string;
            /** Format: int32 */
            hardwareEncodeSessionLimit: number;
            host: string;
            imageExtensions: string[];
            interface: components["schemas"]["InterfaceConfig"];
            liveTranscodeInputArgs?: string;
            liveTranscodeOutputArgs?: string;
            logLevel: string;
            /** Format: int32 */
            maxConcurrentDownloads: number;
            /** Format: int32 */
            maxParallelTasks: number;
            /** Format: int32 */
            maxStreamingTranscodeSize: number;
            /** Format: int32 */
            maxTranscodeSize?: number;
            pluginConfigurations: {
                [key: string]: Record<string, never>;
            };
            /** Format: int32 */
            port: number;
            previewAudio: string;
            previewPreset: string;
            scraping: components["schemas"]["ScrapingConfig"];
            security: components["schemas"]["SecurityConfig"];
            textExtensions: string[];
            transcodeHardwareAcceleration?: string;
            transcodeInputArgs?: string;
            transcodeOutputArgs?: string;
            ui: components["schemas"]["UiConfig"];
            videoExtensions: string[];
            writeImageThumbnails: boolean;
        };
        CovePath: {
            excludeAudio: boolean;
            excludeImage: boolean;
            excludeText: boolean;
            excludeVideo: boolean;
            path: string;
        };
        CreateApiTokenRequest: {
            /** Format: date-time */
            expiresAt?: string;
            name: string;
            scope?: string[];
        };
        CreateContentRuleRequest: {
            appliesTo: string;
            effect: string;
            entityKind: string;
            /** Format: int32 */
            roleId: number;
            scopeKind: string;
            scopeValue: string;
        };
        CreateEntityOverrideRequest: {
            appliesTo: string;
            effect: string;
            entityId: string;
            entityKind: string;
            /** Format: int32 */
            roleId: number;
        };
        CreateInviteRequest: {
            displayName?: string;
            email?: string;
            roles?: string[];
            username?: string;
        };
        CreateRoleRequest: {
            description?: string;
            name: string;
            permissions: string[];
        };
        CreateScrapeAttempt: {
            /** Format: int32 */
            entityId?: number;
            entityType: string;
            fragment?: Record<string, never>;
            inputKind: string;
            name?: string;
            scraperId: string;
            url?: string;
        };
        CreateShareLinkRequest: {
            entityIds: string[];
            entityKind: string;
            /** Format: date-time */
            expiresAt?: string;
            password?: string;
        };
        CreateUserRequest: {
            displayName?: string;
            email?: string;
            /** @default false */
            mustChangePassword: boolean;
            password?: string;
            roles?: string[];
            username: string;
        };
        CriterionModifier: string;
        CustomFieldCriterion: {
            key: string;
            modifier?: components["schemas"]["CriterionModifier"];
            type: string;
            value: string;
            value2?: string;
        };
        CustomFieldDefinition: {
            createdAt?: string;
            /** Format: int32 */
            displayOrder: number;
            entityTypes: string[];
            filterable: boolean;
            /** Format: int32 */
            id: number;
            isMultiValue: boolean;
            key: string;
            label: string;
            options: string[];
            sortable: boolean;
            type: string;
            updatedAt?: string;
        };
        CustomFieldDefinitionCreate: {
            /** Format: int32 */
            displayOrder?: number;
            entityTypes: string[];
            filterable: boolean;
            isMultiValue: boolean;
            key?: string;
            label: string;
            options: string[];
            sortable: boolean;
            type: string;
        };
        CustomFieldDefinitionSync: {
            /** Format: int32 */
            displayOrder?: number;
            entityTypes: string[];
            filterable: boolean;
            /** Format: int32 */
            id?: number;
            isMultiValue: boolean;
            key: string;
            label: string;
            options: string[];
            sortable: boolean;
            type: string;
        };
        CustomFieldDefinitionUpdate: {
            /** Format: int32 */
            displayOrder?: number;
            entityTypes?: string[];
            filterable?: boolean;
            isMultiValue?: boolean;
            key?: string;
            label?: string;
            options?: string[];
            sortable?: boolean;
            type?: string;
        };
        DatabaseMigrationResult: {
            appliedMigrations: string[];
            message: string;
            migrationRequired: boolean;
            pendingMigrations: string[];
            preMigrationBackupPath?: string;
        };
        DateCriterion: {
            modifier?: components["schemas"]["CriterionModifier"];
            value: string;
            value2?: string;
        };
        DeleteFiles: {
            deleteFromDisk: boolean;
            fileIds: number[];
        };
        DependencyInfo: {
            available: boolean;
            id: string;
            /** @default false */
            installed: boolean;
            name?: string;
            resolvedVersion?: string;
            versionConstraint: string;
        };
        DependencyProblem: {
            dependencyId?: string;
            extensionId: string;
            message: string;
        };
        Detection: {
            class: string;
            createdAt: string;
            extra?: null | components["schemas"]["JsonElement"];
            /** Format: int32 */
            frameHeight: number;
            /** Format: int32 */
            frameWidth: number;
            groupKey?: string;
            /** Format: float */
            h: number;
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["DetectionHostType"];
            /** Format: int32 */
            id: number;
            /** Format: double */
            observedAtSec?: number;
            /** Format: int64 */
            refId?: number;
            refKind?: string;
            /** Format: float */
            score: number;
            sourceKey: string;
            sourceRunId?: string;
            updatedAt: string;
            /** Format: float */
            w: number;
            /** Format: float */
            x: number;
            /** Format: float */
            y: number;
        };
        DetectionCreate: {
            class: string;
            extra?: null | components["schemas"]["JsonElement"];
            /** Format: int32 */
            frameHeight: number;
            /** Format: int32 */
            frameWidth: number;
            groupKey?: string;
            /** Format: float */
            h: number;
            /** Format: double */
            observedAtSec?: number;
            /** Format: int64 */
            refId?: number;
            refKind?: string;
            /** Format: float */
            score: number;
            sourceKey?: string;
            sourceRunId?: string;
            /** Format: float */
            w: number;
            /** Format: float */
            x: number;
            /** Format: float */
            y: number;
        };
        /** @enum {string} */
        DetectionHostType: "video" | "image";
        DetectionUpdate: {
            class: string;
            extra?: null | components["schemas"]["JsonElement"];
            /** Format: int32 */
            frameHeight: number;
            /** Format: int32 */
            frameWidth: number;
            groupKey?: string;
            /** Format: float */
            h: number;
            /** Format: double */
            observedAtSec?: number;
            /** Format: int64 */
            refId?: number;
            refKind?: string;
            /** Format: float */
            score: number;
            sourceKey: string;
            sourceRunId?: string;
            /** Format: float */
            w: number;
            /** Format: float */
            x: number;
            /** Format: float */
            y: number;
        };
        DirectoryEntry: {
            isDirectory: boolean;
            path: string;
        };
        DownloaderBatchFollowUp: {
            allowDuplicateDownloads: boolean;
            autoApplyMetadata: boolean;
            createMissingPerformers: boolean;
            createMissingStudio: boolean;
            createMissingTags: boolean;
            generate?: null | components["schemas"]["GenerateOptions"];
            markOrganized: boolean;
            scrapeVideos: boolean;
        };
        DownloaderBatchIssue: {
            kind: string;
            label: string;
            reason: string;
        };
        DownloaderBatchItem: {
            autoApplyMetadata: boolean;
            createEntityIfMissing: boolean;
            createMissingPerformers: boolean;
            createMissingStudio: boolean;
            createMissingTags: boolean;
            downloaderId?: string;
            entity: string;
            /** Format: int32 */
            entityId?: number;
            galleryIds?: number[];
            groupIds?: components["schemas"]["VideoGroupInput"][];
            label?: string;
            markOrganized: boolean;
            qualityId?: string;
            sourceUrl?: string;
            title?: string;
            url: string;
        };
        DownloaderBatchStartRequest: {
            followUp: components["schemas"]["DownloaderBatchFollowUp"];
            items: components["schemas"]["DownloaderBatchItem"][];
            preflightBeforeQueue: boolean;
        };
        DownloaderBatchStartResponse: {
            issues: components["schemas"]["DownloaderBatchIssue"][];
            jobId?: string;
            /** Format: int32 */
            queuedCount: number;
        };
        DownloaderDescriptor: {
            capabilities: string[];
            id: string;
            name: string;
            supportedEntity: string;
            supportedUrlPatterns: string[];
        };
        DownloaderMatch: {
            downloaderId: string;
            downloaderName: string;
            label?: string;
            normalizedUrl: string;
            qualityOptions: components["schemas"]["DownloaderQualityOption"][];
            sourceUrl?: string;
            supportedEntity: string;
        };
        DownloaderMatchRequest: {
            url: string;
        };
        DownloaderPathOverride: {
            downloaderId: string;
            path: string;
            site?: string;
        };
        DownloaderPreflightRequest: {
            entity: string;
            /** Format: int32 */
            entityId?: number;
            url: string;
        };
        DownloaderPreflightResponse: {
            duplicateReason?: string;
            isDuplicate: boolean;
        };
        DownloaderQualityOption: {
            description?: string;
            id: string;
            label: string;
        };
        DownloaderStartRequest: {
            allowDuplicateDownload: boolean;
            autoApplyMetadata: boolean;
            createMissingPerformers: boolean;
            createMissingStudio: boolean;
            createMissingTags: boolean;
            downloaderId: string;
            entity: string;
            /** Format: int32 */
            entityId?: number;
            markOrganized: boolean;
            qualityId?: string;
            sourceUrl?: string;
            url: string;
        };
        DynamicGroupSource: {
            displayName: string;
            key: string;
        };
        Embedding: {
            /** Format: date-time */
            createdAt: string;
            /** Format: int32 */
            dim: number;
            /** Format: double */
            endSec?: number;
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["EmbeddingHostType"];
            /** Format: int32 */
            id: number;
            isSemantic: boolean;
            kind: string;
            kindFamily?: string;
            meta?: null | components["schemas"]["JsonElement"];
            modality: components["schemas"]["EmbeddingModality"];
            /** Format: int32 */
            sectionIndex: number;
            sourceKey: string;
            sourceRunId?: string;
            /** Format: double */
            startSec?: number;
            /** Format: date-time */
            updatedAt: string;
            vector: number[];
        };
        /** @enum {string} */
        EmbeddingHostType: "video" | "image" | "performer" | "face" | "segment";
        /** @enum {string} */
        EmbeddingModality: "visual" | "audio" | "face" | "text" | "other";
        EmbeddingSearchRequest: {
            /** Format: int32 */
            hostId?: number;
            hostType?: null | components["schemas"]["EmbeddingHostType"];
            isSemantic?: boolean;
            /**
             * Format: int32
             * @default 20
             */
            k: number;
            kind?: string;
            kindFamily?: string;
            modality?: null | components["schemas"]["EmbeddingModality"];
            queryText?: string;
            queryVector?: number[];
            sourceKey?: string;
        };
        EmbeddingSearchResult: {
            /** Format: float */
            distance: number;
            /** Format: int32 */
            embeddingId: number;
            /** Format: double */
            endSec?: number;
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["EmbeddingHostType"];
            isSemantic: boolean;
            kind: string;
            kindFamily?: string;
            modality: components["schemas"]["EmbeddingModality"];
            /** Format: int32 */
            sectionIndex: number;
            sourceKey: string;
            sourceRunId?: string;
            /** Format: double */
            startSec?: number;
        };
        EngagementInteraction: {
            at: string;
            /** Format: int32 */
            hostId?: number;
            hostType: string;
            /** Format: int32 */
            id: number;
            kind: string;
            meta?: unknown;
        };
        EngagementInteractionWrite: {
            /** Format: int32 */
            hostId?: number;
            hostType: string;
            kind: string;
            meta?: unknown;
        };
        EntityEngagement: {
            /** Format: int32 */
            completeCount: number;
            /** Format: int32 */
            derivedLikeCount: number;
            /** Format: int32 */
            hostId: number;
            isFavorite: boolean;
            lastPlayedAt?: string;
            /** Format: int32 */
            likeCount: number;
            /** Format: int32 */
            pageVisitCount: number;
            /** Format: int32 */
            playCount: number;
            /** Format: double */
            playDuration: number;
            /** Format: int32 */
            rating?: number;
            /** Format: double */
            resumeTime: number;
        };
        EntityEngagementBatchRequest: {
            hostIds: number[];
            hostType: components["schemas"]["AffinityHostType"];
        };
        EntityFavorite: {
            isFavorite: boolean;
        };
        EntityImageCoverSource: {
            /** Format: int32 */
            imageId?: number;
            /** Format: int32 */
            videoId?: number;
        };
        EntityRatings: {
            /** Format: int32 */
            hostId: number;
            ratings: {
                [key: string]: number;
            };
        };
        ExportOptions: {
            includeGalleries: boolean;
            includeGroups: boolean;
            includePerformers: boolean;
            includeStudios: boolean;
            includeTags: boolean;
            includeVideos: boolean;
        };
        ExtensionAction: {
            actionType: string;
            apiEndpoint?: string;
            entityTypes: string[];
            extensionId: string;
            handlerName?: string;
            icon?: string;
            id: string;
            label: string;
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            pages?: string[];
            requiredPermission?: string;
            /** @default false */
            suppressSuccessAlert: boolean;
        };
        ExtensionDependencyImpact: {
            enabled: boolean;
            id: string;
            kind: string;
            name: string;
            source: string;
            version: string;
        };
        ExtensionExternalDependency: {
            configurationKeys: string[];
            description?: string;
            dockerHint?: string;
            environmentVariables: string[];
            executables: string[];
            extensionIds: string[];
            id: string;
            installHint?: string;
            kind: string;
            name: string;
            nativeHint?: string;
            optional?: boolean;
            required?: boolean;
            settingsKey?: string;
            url?: string;
            versionRequirement?: string;
        };
        ExtensionInfo: {
            author?: string;
            categories: string[];
            dependencies: {
                [key: string]: string;
            };
            description?: string;
            enabled: boolean;
            externalDependencies: components["schemas"]["ExtensionExternalDependency"][];
            hasActions: boolean;
            hasApi: boolean;
            hasData: boolean;
            hasEvents: boolean;
            hasJobs: boolean;
            hasMiddleware: boolean;
            hasState: boolean;
            hasUI: boolean;
            iconUrl?: string;
            id: string;
            /** Format: date-time */
            installedAt?: string;
            jobs: components["schemas"]["ExtensionJobInfo"][];
            kind: string;
            minCoveVersion?: string;
            name: string;
            settings: components["schemas"]["ExtensionSettingManifest"][];
            source: string;
            url?: string;
            version: string;
        };
        ExtensionJobInfo: {
            description?: string;
            id: string;
            name: string;
        };
        ExtensionSettingManifest: {
            defaultValue?: string;
            description?: string;
            displayName?: string;
            extensionIds: string[];
            key?: string;
            label?: string;
            name: string;
            scope?: string;
            type: string;
        };
        Face: {
            /**
             * Format: int32
             * @default 0
             */
            appearanceCount: number;
            coverImageUrl?: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: int32 */
            detectionCount: number;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /**
             * Format: int32
             * @default 0
             */
            frameSampleCount: number;
            /** Format: int32 */
            id: number;
            ignored: boolean;
            /** Format: int32 */
            imageCount: number;
            label?: string;
            /** Format: int32 */
            mergedIntoFaceId?: number;
            /**
             * Format: int32
             * @default 0
             */
            performerFaceCount: number;
            /**
             * Format: int32
             * @default 0
             */
            performerFaceIndex: number;
            /** Format: int32 */
            performerId?: number;
            performerName?: string;
            primarySourceKey?: string;
            topSuggestion?: null | components["schemas"]["FaceTopSuggestion"];
            /** Format: date-time */
            updatedAt: string;
            /** Format: int32 */
            videoCount: number;
        };
        FaceAppearance: {
            /** Format: int32 */
            appearanceId: number;
            /** Format: double */
            firstSeenAtSec?: number;
            /** Format: int32 */
            frameSampleCount: number;
            /** Format: int32 */
            hostId: number;
            hostType: string;
            /** Format: double */
            lastSeenAtSec?: number;
            /** Format: int32 */
            retainedSpatialSampleCount: number;
            /** Format: int32 */
            segmentCount: number;
            thumbnailUrl: string;
            title: string;
            /** Format: float */
            topConfidence?: number;
        };
        FaceBatchDelete: {
            faceIds: number[];
        };
        FaceBatchFailed: {
            error: string;
            /** Format: int32 */
            faceId: number;
        };
        FaceBatchLinkTopSuggestion: {
            /** @default false */
            createFromReference: boolean;
            faceIds: number[];
            /** @default false */
            linkConflicting: boolean;
            /** @default false */
            mergeConflicting: boolean;
        };
        FaceBatchOperationResult: {
            failed: components["schemas"]["FaceBatchFailed"][];
            skipped: components["schemas"]["FaceBatchSkipped"][];
            succeeded: number[];
        };
        FaceBatchSkipped: {
            /** Format: int32 */
            faceId: number;
            reason: string;
        };
        FaceCreate: {
            ignored: boolean;
            label?: string;
            /** Format: int32 */
            performerId?: number;
            primarySourceKey?: string;
        };
        FaceCreatePerformer: {
            name: string;
            /** @default true */
            setPerformerImage: boolean;
        };
        FaceDeleteImpact: {
            /** Format: int32 */
            detectionCount: number;
            /** Format: int32 */
            embeddingCount: number;
            hasCoverImage: boolean;
            /** Format: int32 */
            releasedMergedFaceCount: number;
            /** Format: int32 */
            segmentCount: number;
        };
        FaceHostFace: {
            /** Format: int32 */
            appearanceCount: number;
            coverImageUrl?: string;
            /** Format: double */
            firstSeenAtSec?: number;
            /** Format: int32 */
            frameSampleCount: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageCount: number;
            label?: string;
            /** Format: double */
            lastSeenAtSec?: number;
            /** Format: int32 */
            performerId?: number;
            performerName?: string;
            /** Format: float */
            topConfidence?: number;
            /** Format: int32 */
            videoCount: number;
        };
        FaceIgnore: {
            ignored: boolean;
        };
        FaceLink: {
            /** Format: int32 */
            performerId?: number;
            /** @default false */
            setPerformerImage: boolean;
        };
        FaceMerge: {
            /** Format: int32 */
            targetFaceId: number;
        };
        FaceSimilar: {
            /** Format: int32 */
            appearanceCount: number;
            coverImageUrl?: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: int32 */
            detectionCount: number;
            /** Format: float */
            distance: number;
            /** Format: int32 */
            frameSampleCount: number;
            /** Format: int32 */
            id: number;
            ignored: boolean;
            /** Format: int32 */
            imageCount: number;
            label?: string;
            /** Format: int32 */
            mergedIntoFaceId?: number;
            /** Format: int32 */
            performerId?: number;
            performerName?: string;
            primarySourceKey?: string;
            /** Format: date-time */
            updatedAt: string;
            /** Format: int32 */
            videoCount: number;
        };
        FaceSuggestion: {
            /** Format: float */
            confidence: number;
            conflictGroupId?: string;
            coverImageUrl?: string;
            evidence: components["schemas"]["FaceSuggestionEvidence"][];
            externalUrl?: string;
            /** @default false */
            localPerformerHasImage: boolean;
            /** Format: int32 */
            localPerformerId?: number;
            /** @default false */
            localPerformerIsLocalOnly: boolean;
            /** Format: int32 */
            performerId: number;
            performerName: string;
            referenceEndpoint?: string;
            referenceExternalId?: string;
            /** @default false */
            referenceWillRefreshFromMetadata: boolean;
            why: string;
        };
        FaceSuggestionDecision: {
            decision: string;
            /** Format: int32 */
            performerId: number;
            referenceEndpoint?: string;
            referenceExternalId?: string;
            /** @default false */
            referenceUpdateMetadata: boolean;
            secondaryPerformerIds?: number[];
            /** @default false */
            setPerformerImage: boolean;
        };
        FaceSuggestionEvidence: {
            /** Format: int32 */
            faceId: number;
            /** Format: float */
            similarity: number;
            thumbnailUrl?: string;
        };
        FaceTopSuggestion: {
            /** Format: float */
            confidence: number;
            coverImageUrl?: string;
            externalUrl?: string;
            /** @default false */
            localPerformerHasImage: boolean;
            /** Format: int32 */
            localPerformerId?: number;
            /** @default false */
            localPerformerIsLocalOnly: boolean;
            /** Format: int32 */
            performerId: number;
            performerName: string;
        };
        FaceUpdate: {
            ignored: boolean;
            label?: string;
            /** Format: int32 */
            performerId?: number;
            primarySourceKey?: string;
        };
        FfmpegCapabilities: {
            accelerators: string[];
            decoders: string[];
            ffmpegFound: boolean;
            ffmpegPath?: string;
            /** Format: date-time */
            probedAtUtc: string;
        };
        FieldProvenance: {
            /** Format: float */
            confidence?: number;
            createdAt: string;
            fieldKey: string;
            modelKey?: string;
            sourceKey: string;
            sourceRunId?: string;
            value?: null | components["schemas"]["JsonElement"];
        };
        FileBackedCreate: {
            filePath: string;
        };
        FileSetFingerprints: {
            /** Format: int32 */
            fileId: number;
            fingerprints: components["schemas"]["FingerprintEntry"][];
        };
        FilteredQueryRequestOfAudioFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["AudioFilter"];
        };
        FilteredQueryRequestOfGalleryFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["GalleryFilter"];
        };
        FilteredQueryRequestOfGroupFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["GroupFilter"];
        };
        FilteredQueryRequestOfImageFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["ImageFilter"];
        };
        FilteredQueryRequestOfPerformerFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["PerformerFilter"];
        };
        FilteredQueryRequestOfStudioFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["StudioFilter"];
        };
        FilteredQueryRequestOfTagFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["TagFilter"];
        };
        FilteredQueryRequestOfTextDocumentFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["TextDocumentFilter"];
        };
        FilteredQueryRequestOfVideoFilter: {
            findFilter?: null | components["schemas"]["FindFilter"];
            objectFilter?: null | components["schemas"]["VideoFilter"];
        };
        FindFilter: {
            direction?: components["schemas"]["SortDirection"];
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            perPage?: number;
            q?: string;
            /** Format: int32 */
            seed?: number;
            sort?: string;
        };
        Fingerprint: {
            type: string;
            value: string;
        };
        FingerprintCriterion: {
            modifier?: components["schemas"]["CriterionModifier"];
            type: string;
            value: string;
        };
        FingerprintEntry: {
            type: string;
            value: string;
        };
        Gallery: {
            backCoverPath?: string;
            code?: string;
            /** Format: int32 */
            coverImageId?: number;
            coverPath?: string;
            createdAt: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            displayName?: string;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            files: components["schemas"]["GalleryFileInfo"][];
            folderPath?: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageCount: number;
            organized: boolean;
            performers: components["schemas"]["PerformerSummary"][];
            photographer?: string;
            /** Format: int32 */
            studioId?: number;
            studioName?: string;
            tags: components["schemas"]["Tag"][];
            title?: string;
            updatedAt: string;
            urls: string[];
            /** Format: int32 */
            videoCount: number;
            videoIds: number[];
        };
        GalleryAddImages: {
            imageIds: number[];
        };
        GalleryChapter: {
            createdAt: string;
            /** Format: int32 */
            galleryId: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageIndex: number;
            title: string;
            updatedAt: string;
        };
        GalleryChapterCreate: {
            /** Format: int32 */
            imageIndex: number;
            title: string;
        };
        GalleryChapterUpdate: {
            /** Format: int32 */
            imageIndex?: number;
            title?: string;
        };
        GalleryCreate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            organized: boolean;
            performerIds?: number[];
            photographer?: string;
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
            videoIds?: number[];
        };
        GalleryFileInfo: {
            fingerprints: components["schemas"]["Fingerprint"][];
            /** Format: int32 */
            id: number;
            modTime: string;
            path: string;
            /** Format: int64 */
            size: number;
        };
        GalleryFilter: {
            checksumCriterion?: null | components["schemas"]["StringCriterion"];
            codeCriterion?: null | components["schemas"]["StringCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            dateCriterion?: null | components["schemas"]["DateCriterion"];
            detailsCriterion?: null | components["schemas"]["StringCriterion"];
            fileCountCriterion?: null | components["schemas"]["IntCriterion"];
            fingerprintCriterion?: null | components["schemas"]["FingerprintCriterion"];
            imageCountCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            imageId?: number;
            isMissingCriterion?: null | components["schemas"]["BoolCriterion"];
            organized?: boolean;
            organizedCriterion?: null | components["schemas"]["BoolCriterion"];
            pathCriterion?: null | components["schemas"]["StringCriterion"];
            performerAgeCriterion?: null | components["schemas"]["IntCriterion"];
            performerCountCriterion?: null | components["schemas"]["IntCriterion"];
            performerFavoriteCriterion?: null | components["schemas"]["BoolCriterion"];
            performerIds?: number[];
            performersCriterion?: null | components["schemas"]["MultiIdCriterion"];
            performerTagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            photographerCriterion?: null | components["schemas"]["StringCriterion"];
            /** Format: int32 */
            rating?: number;
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            studioId?: number;
            studiosCriterion?: null | components["schemas"]["MultiIdCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagIds?: number[];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            title?: string;
            titleCriterion?: null | components["schemas"]["StringCriterion"];
            typicalResolutionCriterion?: null | components["schemas"]["IntCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
            videosCriterion?: null | components["schemas"]["MultiIdCriterion"];
        };
        GalleryRemoveImages: {
            imageIds: number[];
        };
        GallerySetCover: {
            /** Format: int32 */
            imageId: number;
        };
        GallerySummary: {
            date?: string;
            /** Format: int32 */
            id: number;
            title?: string;
        };
        GalleryUpdate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            organized?: boolean;
            performerIds?: number[];
            photographer?: string;
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
            videoIds?: number[];
        };
        GenerateOptions: {
            audioIds?: number[];
            audioPhashes: boolean;
            galleryThumbnails: boolean;
            imageIds?: number[];
            imagePhashes: boolean;
            imageThumbnails: boolean;
            md5: boolean;
            overwrite: boolean;
            paths?: string[];
            phashes: boolean;
            previews: boolean;
            segmentPreviews: boolean;
            segments: boolean;
            segmentThumbnails: boolean;
            sprites: boolean;
            textIds?: number[];
            textPhashes: boolean;
            thumbnails: boolean;
            videoIds?: number[];
        };
        GenerateScreenshot: {
            /** Format: double */
            atSeconds?: number;
        };
        Group: {
            aliases?: string;
            allowedHostTypes?: string[];
            /**
             * Format: int32
             * @default 0
             */
            audioCount: number;
            backImagePath?: string;
            /** Format: int32 */
            cachedItemCount?: number;
            /** Format: int32 */
            containingGroupCount: number;
            createdAt: string;
            customFields?: Record<string, never>;
            date?: string;
            description?: string;
            director?: string;
            /**
             * Format: int32
             * @default 0
             */
            faceCount: number;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            frontImagePath?: string;
            /**
             * Format: int32
             * @default 0
             */
            galleryCount: number;
            /** Format: int32 */
            id: number;
            /**
             * Format: int32
             * @default 0
             */
            imageCount: number;
            isCompilation: boolean;
            /** Format: int32 */
            itemCount: number;
            kind?: components["schemas"]["GroupKind"];
            lastResolvedAt?: string;
            name: string;
            /**
             * Format: int32
             * @default 0
             */
            performerCount: number;
            queryJson?: string;
            querySourceKey?: string;
            /**
             * Format: int32
             * @default 0
             */
            segmentCount: number;
            /** @default false */
            showInVideoLists: boolean;
            /**
             * Format: int32
             * @default 0
             */
            sortOrder: number;
            /**
             * Format: int32
             * @default 0
             */
            studioCount: number;
            /** Format: int32 */
            studioId?: number;
            studioName?: string;
            /** Format: int32 */
            subGroupCount: number;
            /**
             * Format: int32
             * @default 0
             */
            tagItemCount: number;
            tags: components["schemas"]["Tag"][];
            /**
             * Format: int32
             * @default 0
             */
            textCount: number;
            updatedAt: string;
            urls: string[];
            /** Format: int32 */
            videoCount: number;
        };
        GroupCreate: {
            aliases?: string;
            allowedHostTypes?: string[];
            customFields?: Record<string, never>;
            date?: string;
            description?: string;
            director?: string;
            kind?: null | components["schemas"]["GroupKind"];
            name: string;
            queryJson?: string;
            querySourceKey?: string;
            /** Format: int32 */
            rating?: number;
            showInVideoLists?: boolean;
            /** Format: int32 */
            sortOrder?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            urls?: string[];
        };
        GroupFilter: {
            aliasesCriterion?: null | components["schemas"]["StringCriterion"];
            allowedHostTypesCriterion?: null | components["schemas"]["StringCriterion"];
            audioCountCriterion?: null | components["schemas"]["IntCriterion"];
            cachedItemCountCriterion?: null | components["schemas"]["IntCriterion"];
            containingGroupCountCriterion?: null | components["schemas"]["IntCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            dateCriterion?: null | components["schemas"]["DateCriterion"];
            directorCriterion?: null | components["schemas"]["StringCriterion"];
            durationCriterion?: null | components["schemas"]["IntCriterion"];
            faceCountCriterion?: null | components["schemas"]["IntCriterion"];
            galleryCountCriterion?: null | components["schemas"]["IntCriterion"];
            hasQueryCriterion?: null | components["schemas"]["BoolCriterion"];
            imageCountCriterion?: null | components["schemas"]["IntCriterion"];
            isBuiltInCriterion?: null | components["schemas"]["BoolCriterion"];
            isMissingCriterion?: null | components["schemas"]["BoolCriterion"];
            itemCountCriterion?: null | components["schemas"]["IntCriterion"];
            kindCriterion?: null | components["schemas"]["StringCriterion"];
            lastResolvedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            name?: string;
            nameCriterion?: null | components["schemas"]["StringCriterion"];
            performerItemCountCriterion?: null | components["schemas"]["IntCriterion"];
            performersCriterion?: null | components["schemas"]["MultiIdCriterion"];
            querySourceKeyCriterion?: null | components["schemas"]["StringCriterion"];
            /** Format: int32 */
            rating?: number;
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            segmentCountCriterion?: null | components["schemas"]["IntCriterion"];
            showInVideoListsCriterion?: null | components["schemas"]["BoolCriterion"];
            sortOrderCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            studioId?: number;
            studioItemCountCriterion?: null | components["schemas"]["IntCriterion"];
            studiosCriterion?: null | components["schemas"]["MultiIdCriterion"];
            subGroupCountCriterion?: null | components["schemas"]["IntCriterion"];
            synopsisCriterion?: null | components["schemas"]["StringCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagIds?: number[];
            tagItemCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            textCountCriterion?: null | components["schemas"]["IntCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
            videoCountCriterion?: null | components["schemas"]["IntCriterion"];
        };
        GroupItem: {
            /** Format: int32 */
            childGroupId?: number;
            childGroupName?: string;
            createdAt: string;
            /** Format: double */
            endSec?: number;
            /** Format: int32 */
            groupId: number;
            /** Format: int32 */
            hostId: number;
            hostType: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageId?: number;
            imageTitle?: string;
            kind: components["schemas"]["GroupItemKind"];
            notes?: string;
            /** Format: int32 */
            orderIndex: number;
            snapshotAt?: string;
            /** Format: int32 */
            sourceProfileId?: number;
            sourceQueryJson?: string;
            sourceSpanKey?: string;
            /** Format: double */
            startSec?: number;
            title?: string;
            updatedAt: string;
            /** Format: int32 */
            videoId?: number;
            videoTitle?: string;
        };
        GroupItemCreate: {
            /** Format: double */
            endSec?: number;
            /** Format: int32 */
            hostId?: number;
            hostType?: string;
            kind: components["schemas"]["GroupItemKind"];
            notes?: string;
            /** Format: int32 */
            orderIndex: number;
            /** Format: int32 */
            sourceProfileId?: number;
            sourceQueryJson?: string;
            sourceSpanKey?: string;
            /** Format: double */
            startSec?: number;
            title?: string;
            /** Format: int32 */
            videoId?: number;
        };
        /** @enum {string} */
        GroupItemKind: "video" | "videoRange" | "image" | "audio" | "text" | "group" | "performer" | "studio" | "tag" | "gallery" | "face" | "segment";
        GroupItemsFromSpans: {
            spans: components["schemas"]["GroupItemSpanInput"][];
        };
        GroupItemSpanInput: {
            derivedQuery?: null | components["schemas"]["SegmentSpanDerivedQuery"];
            /** Format: double */
            endSec?: number;
            /** Format: int32 */
            profileId?: number;
            spanKey?: string;
            /** Format: double */
            startSec?: number;
            title?: string;
            /** Format: int32 */
            videoId?: number;
        };
        GroupItemsRemoveHosts: {
            hostIds: number[];
            kind: components["schemas"]["GroupItemKind"];
        };
        GroupItemsReorder: {
            ids: number[];
            /**
             * Format: int32
             * @default 0
             */
            startIndex: number;
        };
        GroupItemUpdate: {
            /** Format: double */
            endSec?: number;
            kind: components["schemas"]["GroupItemKind"];
            notes?: string;
            /** Format: int32 */
            orderIndex: number;
            /** Format: double */
            startSec?: number;
            title?: string;
        };
        /**
         * @default static
         * @enum {string}
         */
        GroupKind: "static" | "dynamic";
        GroupPlaybackManifest: {
            items: components["schemas"]["GroupPlaybackManifestItem"][];
        };
        GroupPlaybackManifestItem: {
            /** Format: int32 */
            audioId?: number;
            /** Format: double */
            displayDurationSec?: number;
            /** Format: double */
            durationSec?: number;
            /** Format: double */
            endSec?: number;
            format?: string;
            /** Format: int32 */
            groupItemId: number;
            /** @default false */
            hasVideoTrack: boolean;
            /** Format: int32 */
            hostId: number;
            hostType: string;
            /** Format: int32 */
            imageId?: number;
            posterPath?: string;
            /** Format: int32 */
            segmentId?: number;
            src: string;
            /** Format: double */
            startSec: number;
            /** Format: int32 */
            textId?: number;
            title?: string;
            /** Format: int32 */
            videoId?: number;
            videoTitle?: string;
        };
        GroupQueryUpdate: {
            /** Format: int32 */
            cacheTtlSec?: number;
            queryJson?: string;
            querySourceKey: string;
        };
        GroupSummary: {
            /** Format: int32 */
            id: number;
            name: string;
            /** Format: int32 */
            videoIndex: number;
        };
        GroupUpdate: {
            aliases?: string;
            allowedHostTypes?: string[];
            customFields?: Record<string, never>;
            date?: string;
            description?: string;
            director?: string;
            kind?: null | components["schemas"]["GroupKind"];
            name?: string;
            queryJson?: string;
            querySourceKey?: string;
            /** Format: int32 */
            rating?: number;
            showInVideoLists?: boolean;
            /** Format: int32 */
            sortOrder?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            urls?: string[];
        };
        IdentifyDefaultsConfig: {
            /** Format: int32 */
            autoApplyMaxDurationDifferenceSeconds?: number;
            /** Format: int32 */
            autoApplyMaxPhashDistance?: number;
            /** Format: int32 */
            autoApplyMinFingerprintMatches?: number;
            createPerformers: boolean;
            createStudios: boolean;
            createTags: boolean;
        };
        IdentifyOptions: {
            createPerformers?: boolean;
            createStudios?: boolean;
            createTags?: boolean;
            fieldStrategies?: {
                [key: string]: string;
            };
            markOrganized: boolean;
            performerGenders?: string[];
            setCoverImage: boolean;
            setPerformers: boolean;
            setStudio: boolean;
            setTags: boolean;
            skipMultipleMatches: boolean;
            skipSingleNamePerformers: boolean;
            sources?: string[];
            videoIds?: number[];
        };
        /** Format: binary */
        IFormFile: string;
        Image: {
            code?: string;
            contextTagApplications?: components["schemas"]["TagApplication"][];
            createdAt: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            files: components["schemas"]["ImageFile"][];
            galleries: components["schemas"]["GallerySummary"][];
            /** Format: int32 */
            galleryCount: number;
            galleryIds: number[];
            groups: components["schemas"]["GroupSummary"][];
            /** Format: int32 */
            id: number;
            organized: boolean;
            performers: components["schemas"]["PerformerSummary"][];
            photographer?: string;
            /** Format: int32 */
            studioId?: number;
            studioName?: string;
            tags: components["schemas"]["Tag"][];
            title?: string;
            updatedAt: string;
            urls: string[];
        };
        ImageCreate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            galleryIds?: number[];
            groupIds?: components["schemas"]["VideoGroupInput"][];
            organized: boolean;
            performerIds?: number[];
            photographer?: string;
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        ImageFile: {
            basename: string;
            format: string;
            /** Format: int32 */
            height: number;
            /** Format: int32 */
            id: number;
            path: string;
            /** Format: int64 */
            size: number;
            /** Format: int32 */
            width: number;
        };
        ImageFilter: {
            checksumCriterion?: null | components["schemas"]["StringCriterion"];
            codeCriterion?: null | components["schemas"]["StringCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            dateCriterion?: null | components["schemas"]["DateCriterion"];
            detailsCriterion?: null | components["schemas"]["StringCriterion"];
            fileCountCriterion?: null | components["schemas"]["IntCriterion"];
            fingerprintCriterion?: null | components["schemas"]["FingerprintCriterion"];
            galleriesCriterion?: null | components["schemas"]["MultiIdCriterion"];
            /** Format: int32 */
            galleryId?: number;
            ids?: number[];
            isMissingCriterion?: null | components["schemas"]["BoolCriterion"];
            likeCounterCriterion?: null | components["schemas"]["IntCriterion"];
            organized?: boolean;
            organizedCriterion?: null | components["schemas"]["BoolCriterion"];
            orientationCriterion?: null | components["schemas"]["StringCriterion"];
            pathCriterion?: null | components["schemas"]["StringCriterion"];
            performerAgeCriterion?: null | components["schemas"]["IntCriterion"];
            performerCountCriterion?: null | components["schemas"]["IntCriterion"];
            performerFavoriteCriterion?: null | components["schemas"]["BoolCriterion"];
            performerIds?: number[];
            performersCriterion?: null | components["schemas"]["MultiIdCriterion"];
            performerTagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            photographerCriterion?: null | components["schemas"]["StringCriterion"];
            /** Format: int32 */
            rating?: number;
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            resolutionCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            studioId?: number;
            studiosCriterion?: null | components["schemas"]["MultiIdCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagIds?: number[];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            title?: string;
            titleCriterion?: null | components["schemas"]["StringCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
        };
        ImageUpdate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            galleryIds?: number[];
            groupIds?: components["schemas"]["VideoGroupInput"][];
            organized?: boolean;
            performerIds?: number[];
            photographer?: string;
            /** Format: int32 */
            rating?: number;
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        ImportOptions: {
            duplicateHandling: boolean;
            filePath: string;
        };
        ImportRequest: {
            generatedPath?: string;
            /** @default true */
            migrateGeneratedContent: boolean;
            pathMappings?: components["schemas"]["PathMappingRequest"][];
            stashDbPath: string;
        };
        InstallExtensionFromUrlRequest: {
            trustUnverified: boolean;
            url: string;
        };
        IntCriterion: {
            modifier?: components["schemas"]["CriterionModifier"];
            /** Format: int32 */
            value?: number;
            /** Format: int32 */
            value2?: number;
        };
        InteractionEvent: {
            at: string;
            kind: string;
            meta?: unknown;
        };
        InterfaceConfig: {
            /** Format: int32 */
            defaultDurationForImages?: number;
            disableDropdownCreatePerformer: boolean;
            disableDropdownCreateStudio: boolean;
            disableDropdownCreateTag: boolean;
            handyConnectionEnabled: boolean;
            handyKey?: string;
            language?: string;
            menuItems: string[];
        };
        InviteRedeemRequest: {
            password: string;
            token: string;
            username?: string;
        };
        JobInfo: {
            /** Format: date-time */
            completedAt?: string;
            description: string;
            error?: string;
            /** Format: double */
            etaSeconds?: number;
            id: string;
            /** Format: double */
            progress: number;
            /** Format: date-time */
            startedAt: string;
            status: components["schemas"]["JobStatus"];
            subTask?: string;
            summary?: string;
            type: string;
            /** Format: int32 */
            unitsCompleted?: number;
            /** Format: int32 */
            unitsFailed?: number;
            /** Format: int32 */
            unitsSkipped?: number;
            /** Format: int32 */
            unitsSucceeded?: number;
            /** Format: int32 */
            unitsTotal?: number;
            /** Format: date-time */
            updatedAt?: string;
        };
        /** @enum {string} */
        JobStatus: "pending" | "running" | "completed" | "failed" | "cancelled";
        JsonElement: unknown;
        LibraryFolder: {
            hasChildren: boolean;
            name: string;
            path: string;
        };
        LogEntry: {
            exception?: string;
            level: string;
            message: string;
            timestamp: string;
        };
        LoginRequest: {
            password: string;
            username: string;
        };
        MeResponse: {
            permissions: string[];
            readGrantedEntityKinds: string[];
            user: components["schemas"]["MeUser"];
        };
        MetadataBatchDefaultsConfig: {
            createParentStudios: boolean;
            excludeFields: string[];
            refreshAlreadyTagged: boolean;
        };
        MetadataServer: {
            apiKey: string;
            endpoint: string;
            /** Format: int32 */
            maxRequestsPerMinute: number;
            name: string;
        };
        MetadataServerEndpoint: {
            endpoint: string;
        };
        MetadataServerEntityCandidate: {
            existsLocally: boolean;
            /** Format: int32 */
            localId?: number;
            name: string;
            remoteId: string;
        };
        MetadataServerFindByIdsRequest: {
            endpoint: string;
            ids: string[];
        };
        MetadataServerFingerprint: {
            algorithm: string;
            /** Format: int32 */
            duration?: number;
            hash: string;
        };
        MetadataServerPerformerBatchTagRequest: {
            endpoint: string;
            excludeFields?: string[];
            filter?: null | components["schemas"]["PerformerFilter"];
            ids?: number[];
            refreshAlreadyTagged: boolean;
            selectAll: boolean;
        };
        MetadataServerPerformerImportRequest: {
            endpoint: string;
            fieldStrategies?: {
                [key: string]: string;
            };
            performerId: string;
        };
        MetadataServerPerformerMatch: {
            aliases: string[];
            birthDate?: string;
            country?: string;
            deleted: boolean;
            disambiguation?: string;
            endpoint: string;
            gender?: string;
            id: string;
            imageUrl?: string;
            mergedIntoId?: string;
            metadataServerName: string;
            name: string;
            urls: string[];
        };
        MetadataServerStudioBatchTagRequest: {
            createParentStudios: boolean;
            endpoint: string;
            excludeFields?: string[];
            filter?: null | components["schemas"]["StudioFilter"];
            ids?: number[];
            refreshAlreadyTagged: boolean;
            selectAll: boolean;
        };
        MetadataServerStudioImportRequest: {
            endpoint: string;
            fieldStrategies?: {
                [key: string]: string;
            };
            studioId: string;
        };
        MetadataServerStudioMatch: {
            aliases: string[];
            endpoint: string;
            id: string;
            imageUrl?: string;
            metadataServerName: string;
            name: string;
            parentName?: string;
            urls: string[];
        };
        MetadataServerTagBatchTagRequest: {
            endpoint: string;
            excludeFields?: string[];
            filter?: null | components["schemas"]["TagFilter"];
            ids?: number[];
            refreshAlreadyTagged: boolean;
            selectAll: boolean;
        };
        MetadataServerTagImportRequest: {
            endpoint: string;
            tagId: string;
        };
        MetadataServerTagMatch: {
            aliases: string[];
            description?: string;
            endpoint: string;
            id: string;
            metadataServerName: string;
            name: string;
        };
        MetadataServerValidationResult: {
            status: string;
            username?: string;
            valid: boolean;
        };
        MetadataServerVideoEntityOverride: {
            action: string;
            /** Format: int32 */
            localId?: number;
            name: string;
            remoteId: string;
        };
        MetadataServerVideoImportRequest: {
            endpoint: string;
            excludedPerformerNames?: string[];
            excludedTagNames?: string[];
            fieldStrategies?: {
                [key: string]: string;
            };
            markOrganized: boolean;
            onlyExistingPerformers: boolean;
            onlyExistingStudio: boolean;
            onlyExistingTags: boolean;
            overwriteExplicitCover: boolean;
            performerGenders?: string[];
            performerOverrides?: components["schemas"]["MetadataServerVideoEntityOverride"][];
            setCoverImage: boolean;
            setPerformers: boolean;
            setStudio: boolean;
            setTags: boolean;
            skipSingleNamePerformers: boolean;
            studioOverride?: null | components["schemas"]["MetadataServerVideoEntityOverride"];
            tagOverrides?: components["schemas"]["MetadataServerVideoEntityOverride"][];
            videoId: string;
        };
        MetadataServerVideoMatch: {
            code?: string;
            date?: string;
            details?: string;
            director?: string;
            /** Format: int32 */
            duration?: number;
            endpoint: string;
            fingerprintAlgorithms: string[];
            fingerprints: components["schemas"]["MetadataServerFingerprint"][];
            id: string;
            imageUrl?: string;
            /** Format: int32 */
            matchCount: number;
            metadataServerName: string;
            performerCandidates: components["schemas"]["MetadataServerEntityCandidate"][];
            performerNames: string[];
            studioCandidate?: null | components["schemas"]["MetadataServerEntityCandidate"];
            studioName?: string;
            tagCandidates: components["schemas"]["MetadataServerEntityCandidate"][];
            tagNames: string[];
            title?: string;
            urls: string[];
        };
        MeUser: {
            id?: string;
            kind: string;
            roles: string[];
            uiPreferences?: null | components["schemas"]["UserUiPreferences"];
            username?: string;
        };
        MoveFiles: {
            destinationPath: string;
            fileIds: number[];
        };
        MultiIdCriterion: {
            /** Format: int32 */
            depth?: number;
            excludes?: number[];
            modifier?: components["schemas"]["CriterionModifier"];
            requiredIds?: number[];
            /** Format: int32 */
            requiredIdsDepth?: number;
            value: number[];
        };
        PaginatedResponseOfAiRun: {
            items: components["schemas"]["AiRun"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfAudio: {
            items: components["schemas"]["Audio"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfEmbedding: {
            items: components["schemas"]["Embedding"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfFace: {
            items: components["schemas"]["Face"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfFaceAppearance: {
            items: components["schemas"]["FaceAppearance"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfFaceSimilar: {
            items: components["schemas"]["FaceSimilar"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfGallery: {
            items: components["schemas"]["Gallery"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfGroup: {
            items: components["schemas"]["Group"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfGroupItem: {
            items: components["schemas"]["GroupItem"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfImage: {
            items: components["schemas"]["Image"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfPerformer: {
            items: components["schemas"]["Performer"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfSegmentRecord: {
            items: components["schemas"]["SegmentRecord"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfStudio: {
            items: components["schemas"]["Studio"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfTagList: {
            items: components["schemas"]["TagList"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfTextDocument: {
            items: components["schemas"]["TextDocument"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfVideo: {
            items: components["schemas"]["Video"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PaginatedResponseOfVideoListEntry: {
            items: components["schemas"]["VideoListEntry"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        PathMappingRequest: {
            source: string;
            target: string;
        };
        Performer: {
            aliases: string[];
            /** Format: int32 */
            audioCount: number;
            birthdate?: string;
            careerEnd?: string;
            careerStart?: string;
            circumcised?: string;
            country?: string;
            createdAt: string;
            customFields?: Record<string, never>;
            deathDate?: string;
            details?: string;
            disambiguation?: string;
            ethnicity?: string;
            eyeColor?: string;
            /**
             * Format: int32
             * @default 0
             */
            faceCount: number;
            fakeTits?: string;
            favorite: boolean;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /** Format: int32 */
            galleryCount: number;
            gender?: string;
            /** Format: int32 */
            groupCount: number;
            hairColor?: string;
            /** Format: int32 */
            heightCm?: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageCount: number;
            imagePath?: string;
            measurements?: string;
            name: string;
            /** Format: double */
            penisLength?: number;
            piercings?: string;
            remoteIds: components["schemas"]["PerformerRemoteId"][];
            tags: components["schemas"]["Tag"][];
            tattoos?: string;
            /** Format: int32 */
            textCount: number;
            updatedAt: string;
            urls: string[];
            /** Format: int32 */
            videoCount: number;
            /** Format: int32 */
            weight?: number;
        };
        PerformerApplyScrapedRequest: {
            collectionModes?: {
                [key: string]: string;
            };
            createMissingTags: boolean;
            replaceFields?: string[];
            scraped: components["schemas"]["ScrapedPerformer"];
        };
        PerformerCreate: {
            aliases?: string[];
            birthdate?: string;
            careerEnd?: string;
            careerStart?: string;
            circumcised?: string;
            country?: string;
            customFields?: Record<string, never>;
            deathDate?: string;
            details?: string;
            disambiguation?: string;
            ethnicity?: string;
            eyeColor?: string;
            fakeTits?: string;
            favorite: boolean;
            gender?: string;
            hairColor?: string;
            /** Format: int32 */
            heightCm?: number;
            measurements?: string;
            name: string;
            /** Format: double */
            penisLength?: number;
            piercings?: string;
            /** Format: int32 */
            rating?: number;
            remoteIds?: components["schemas"]["PerformerRemoteId"][];
            tagIds?: number[];
            tattoos?: string;
            urls?: string[];
            /** Format: int32 */
            weight?: number;
        };
        PerformerFilter: {
            ageCriterion?: null | components["schemas"]["IntCriterion"];
            aliasesCriterion?: null | components["schemas"]["StringCriterion"];
            birthdateCriterion?: null | components["schemas"]["DateCriterion"];
            careerEndCriterion?: null | components["schemas"]["DateCriterion"];
            careerLengthCriterion?: null | components["schemas"]["IntCriterion"];
            careerStartCriterion?: null | components["schemas"]["DateCriterion"];
            circumcisedCriterion?: null | components["schemas"]["StringCriterion"];
            countryCriterion?: null | components["schemas"]["StringCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            deathDateCriterion?: null | components["schemas"]["DateCriterion"];
            detailsCriterion?: null | components["schemas"]["StringCriterion"];
            disambiguationCriterion?: null | components["schemas"]["StringCriterion"];
            ethnicityCriterion?: null | components["schemas"]["StringCriterion"];
            eyeColorCriterion?: null | components["schemas"]["StringCriterion"];
            fakeTitsCriterion?: null | components["schemas"]["StringCriterion"];
            favorite?: boolean;
            favoriteCriterion?: null | components["schemas"]["BoolCriterion"];
            galleryCountCriterion?: null | components["schemas"]["IntCriterion"];
            genderCriterion?: null | components["schemas"]["StringCriterion"];
            groupsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            hairColorCriterion?: null | components["schemas"]["StringCriterion"];
            heightCriterion?: null | components["schemas"]["IntCriterion"];
            imageCountCriterion?: null | components["schemas"]["IntCriterion"];
            isMissingCriterion?: null | components["schemas"]["BoolCriterion"];
            likeCounterCriterion?: null | components["schemas"]["IntCriterion"];
            measurementsCriterion?: null | components["schemas"]["StringCriterion"];
            name?: string;
            nameCriterion?: null | components["schemas"]["StringCriterion"];
            pathCriterion?: null | components["schemas"]["StringCriterion"];
            penisLengthCriterion?: null | components["schemas"]["IntCriterion"];
            piercingsCriterion?: null | components["schemas"]["StringCriterion"];
            playCountCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            rating?: number;
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCountCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCriterion?: null | components["schemas"]["StringCriterion"];
            remoteIdValueCriterion?: null | components["schemas"]["StringCriterion"];
            studioCountCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            studioId?: number;
            studiosCriterion?: null | components["schemas"]["MultiIdCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagIds?: number[];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            tattooCriterion?: null | components["schemas"]["StringCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
            videoCountCriterion?: null | components["schemas"]["IntCriterion"];
            weightCriterion?: null | components["schemas"]["IntCriterion"];
        };
        PerformerMerge: {
            sourceIds: number[];
            /** Format: int32 */
            targetId: number;
        };
        PerformerRemoteId: {
            endpoint: string;
            remoteId: string;
        };
        PerformerScrapePreview: {
            inputKind: string;
            scraped: components["schemas"]["ScrapedPerformer"];
            sourceValue?: string;
        };
        PerformerScrapeRequest: {
            /** @default true */
            createMissingTags: boolean;
            inputKind?: string;
            name?: string;
            scraperId?: string;
            url?: string;
        };
        PerformerScrapeUrlRequest: {
            /** @default true */
            createMissingTags: boolean;
            url?: string;
        };
        PerformerSummary: {
            /**
             * Format: int32
             * @default 0
             */
            audioCount: number;
            birthdate?: string;
            disambiguation?: string;
            favorite: boolean;
            /**
             * Format: int32
             * @default 0
             */
            galleryCount: number;
            gender?: string;
            /** Format: int32 */
            id: number;
            /**
             * Format: int32
             * @default 0
             */
            imageCount: number;
            imagePath?: string;
            name: string;
            /**
             * Format: int32
             * @default 0
             */
            textCount: number;
            /**
             * Format: int32
             * @default 0
             */
            videoCount: number;
        };
        PerformerUpdate: {
            aliases?: string[];
            birthdate?: string;
            careerEnd?: string;
            careerStart?: string;
            circumcised?: string;
            country?: string;
            customFields?: Record<string, never>;
            deathDate?: string;
            details?: string;
            disambiguation?: string;
            ethnicity?: string;
            eyeColor?: string;
            fakeTits?: string;
            favorite?: boolean;
            gender?: string;
            hairColor?: string;
            /** Format: int32 */
            heightCm?: number;
            measurements?: string;
            name?: string;
            /** Format: double */
            penisLength?: number;
            piercings?: string;
            /** Format: int32 */
            rating?: number;
            remoteIds?: components["schemas"]["PerformerRemoteId"][];
            tagIds?: number[];
            tattoos?: string;
            urls?: string[];
            /** Format: int32 */
            weight?: number;
        };
        PlaybackInterval: {
            /** Format: double */
            endSec: number;
            recordedAt: string;
            /** Format: double */
            startSec: number;
        };
        PlaybackIntervalInput: {
            /** Format: double */
            endSec: number;
            /** Format: double */
            startSec: number;
        };
        PlaybackIntervalsRequest: {
            autoplay?: boolean;
            /** Format: double */
            clipEndSec?: number;
            /** Format: double */
            clipStartSec?: number;
            context?: unknown;
            /** Format: double */
            currentPositionSec: number;
            fullscreen?: boolean;
            /** Format: int32 */
            groupItemId?: number;
            /** Format: int32 */
            hostId: number;
            hostType: string;
            intervals: components["schemas"]["PlaybackIntervalInput"][];
            /** Format: int32 */
            itemHostId?: number;
            itemHostType?: string;
            /** Format: double */
            mediaDurationSec: number;
            muted?: boolean;
            /** Format: int32 */
            parentHostId?: number;
            parentHostType?: string;
            /** Format: double */
            playbackRate?: number;
            recommendationSource?: string;
            referrer?: string;
            route?: string;
            scopeKey?: string;
            /** Format: int32 */
            segmentId?: number;
            /** Format: uuid */
            sessionId: string;
            state: string;
            surface?: string;
        };
        Plugin: {
            description: string;
            enabled: boolean;
            id: string;
            name: string;
            settings?: components["schemas"]["PluginSettingSchema"][];
            tasks: components["schemas"]["PluginTask"][];
            url?: string;
            version: string;
        };
        PluginSettings: {
            enabledMap: {
                [key: string]: boolean;
            };
        };
        PluginSettingSchema: {
            description?: string;
            displayName?: string;
            name: string;
            type: string;
        };
        PluginTask: {
            description: string;
            name: string;
        };
        PreviewRequest: {
            stashDbPath: string;
        };
        /** @enum {string} */
        RatingStarPrecision: "full" | "half" | "quarter" | "tenth";
        RatingSystemOptions: {
            starPrecision: components["schemas"]["RatingStarPrecision"];
            type: components["schemas"]["RatingSystemType"];
        };
        /** @enum {string} */
        RatingSystemType: "stars" | "decimal";
        RecomputeDerivedCountsResult: {
            /** Format: int32 */
            entitiesRecomputed: number;
        };
        RefreshRequest: {
            refreshToken: string;
        };
        RegistryExtensionDetail: {
            author?: string;
            categories: string[];
            changelog?: string;
            dependencies: {
                [key: string]: string;
            };
            description?: string;
            externalDependencies: components["schemas"]["ExtensionExternalDependency"][];
            iconUrl?: string;
            id: string;
            kind: string;
            minCoveVersion?: string;
            name: string;
            readme?: string;
            screenshots: string[];
            settings: components["schemas"]["ExtensionSettingManifest"][];
            /** Format: date-time */
            updatedAt?: string;
            url?: string;
            version: string;
            versions: components["schemas"]["RegistryVersionInfo"][];
        };
        RegistryExtensionSummary: {
            author?: string;
            categories: string[];
            description?: string;
            iconUrl?: string;
            id: string;
            kind: string;
            minCoveVersion?: string;
            name: string;
            /** Format: date-time */
            updatedAt?: string;
            version: string;
        };
        RegistryInstallExtensionRef: {
            id: string;
            name: string;
            version: string;
        };
        RegistryInstallRequest: {
            extensionId: string;
            installDependencies: boolean;
            version: string;
        };
        RegistryInstallResult: {
            extension?: null | components["schemas"]["RegistryInstallExtensionRef"];
            installedDependencies?: string[];
            message?: string;
            missingDependencies?: components["schemas"]["DependencyInfo"][];
            path?: string;
            requiresDependencies?: boolean;
        };
        RegistrySearchResult: {
            items: components["schemas"]["RegistryExtensionSummary"][];
            /** Format: int32 */
            page?: number;
            /** Format: int32 */
            pageSize?: number;
            /** Format: int32 */
            totalCount?: number;
        };
        RegistryUninstallRequest: {
            extensionId: string;
            uninstallDependents: boolean;
        };
        RegistryUninstallResult: {
            dependents?: components["schemas"]["ExtensionDependencyImpact"][];
            extension?: null | components["schemas"]["ExtensionDependencyImpact"];
            message?: string;
            requiresDependents?: boolean;
            uninstalledExtensions?: string[];
        };
        RegistryUpdateInfo: {
            changelog?: string;
            currentVersion: string;
            extensionId: string;
            latestVersion: string;
        };
        RegistryVersionInfo: {
            changelog?: string;
            checksum?: string;
            dependencies: {
                [key: string]: string;
            };
            minCoveVersion?: string;
            /** Format: date-time */
            releasedAt?: string;
            version: string;
        };
        ReorderJobRequest: {
            beforeJobId?: string;
        };
        ReorderSubGroups: {
            subGroupIds: number[];
        };
        ResolvedSpan: {
            collapsedToInstant: boolean;
            colorHint?: string;
            /** Format: double */
            endSec: number;
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["SegmentHostType"];
            kind?: string;
            /** Format: int32 */
            lane?: number;
            segmentIds: number[];
            sourceKey?: string;
            spanKey: string;
            /** Format: double */
            startSec: number;
            /** Format: int32 */
            tagId?: number;
            tagName?: string;
        };
        ResolvedSpanDetail: {
            intervals: components["schemas"]["ResolvedSpanInterval"][];
            /** Format: int32 */
            profileId: number;
            /** Format: int32 */
            profileVersion: number;
            span: components["schemas"]["ResolvedSpan"];
            /** Format: int32 */
            videoId: number;
            videoTitle?: string;
        };
        ResolvedSpanInterval: {
            /** Format: double */
            endSec: number;
            /** Format: double */
            startSec: number;
        };
        ResolvedSpanList: {
            spans: components["schemas"]["ResolvedSpan"][];
        };
        ResolveScrapeRelationsRequest: {
            performers: string[];
            tags: string[];
        };
        ResolveScrapeRelationsResult: {
            performers: components["schemas"]["ScrapeRelationMatch"][];
            tags: components["schemas"]["ScrapeRelationMatch"][];
        };
        RestoreBackupRequest: {
            backupPath: string;
        };
        RestoreBackupResult: {
            backupPath: string;
            message: string;
            preRestoreBackupPath?: string;
        };
        RunPluginTask: {
            args?: {
                [key: string]: string;
            };
            pluginId: string;
            taskName: string;
        };
        SavedFilter: {
            findFilter?: string;
            /** Format: int32 */
            id: number;
            mode: string;
            name: string;
            objectFilter?: string;
            uiOptions?: string;
        };
        SavedFilterCreate: {
            findFilter?: string;
            mode: string;
            name: string;
            objectFilter?: string;
            uiOptions?: string;
        };
        SavedFilterUpdate: {
            findFilter?: string;
            mode?: string;
            name?: string;
            objectFilter?: string;
            uiOptions?: string;
        };
        ScanOptions: {
            paths?: string[];
            rescan: boolean;
            scanGenerateAudioPhashes: boolean;
            scanGenerateCovers: boolean;
            scanGenerateImagePhashes: boolean;
            scanGenerateMd5: boolean;
            scanGeneratePhashes: boolean;
            scanGeneratePreviews: boolean;
            scanGenerateSprites: boolean;
            scanGenerateTextPhashes: boolean;
            scanGenerateThumbnails: boolean;
            scanGenerators: boolean;
        };
        ScrapeApplyDefaultsConfig: {
            createMissingPerformers: boolean;
            createMissingStudio: boolean;
            createMissingTags: boolean;
            hydratePerformers: boolean;
            markOrganized: boolean;
        };
        ScrapeAttempt: {
            appliedAt?: string;
            candidateResultsJson?: string;
            createdAt: string;
            /** Format: int32 */
            entityId?: number;
            entitySnapshotJson?: string;
            entityType: string;
            error?: string;
            /** Format: uuid */
            id: string;
            inputJson?: string;
            inputKind: string;
            resultJson?: string;
            scraperId: string;
            status: string;
        };
        ScrapeCollectionItemSelection: {
            action?: string;
            name?: string;
        };
        ScrapedPerformer: {
            aliases: string[];
            birthdate?: string;
            country?: string;
            details?: string;
            disambiguation?: string;
            ethnicity?: string;
            eyeColor?: string;
            gender?: string;
            hairColor?: string;
            /** Format: int32 */
            heightCm?: number;
            imageUrl?: string;
            measurements?: string;
            name?: string;
            piercings?: string;
            sourceScraperId?: string;
            tagNames: string[];
            tattoos?: string;
            urls: string[];
            /** Format: int32 */
            weight?: number;
        };
        ScrapeFragmentRequest: {
            entityType: string;
            fragment: Record<string, never>;
            scraperId: string;
        };
        ScrapeNameRequest: {
            entityType: string;
            name: string;
            scraperId: string;
        };
        ScrapeRelationMatch: {
            input: string;
            matchedName: string;
        };
        ScraperMatchUrlRequest: {
            entityType?: string;
            url: string;
        };
        ScraperPreference: {
            entityType: string;
            scraperId: string;
            site: string;
        };
        ScraperSummary: {
            entityType: string;
            id: string;
            name: string;
            preferenceSites?: string[];
            sourcePath: string;
            supportedScrapes: string[];
            urls: string[];
        };
        ScrapeUrlRequest: {
            entityType: string;
            scraperId: string;
            url: string;
        };
        ScrapingConfig: {
            identifyDefaults: components["schemas"]["IdentifyDefaultsConfig"];
            metadataBatchDefaults: components["schemas"]["MetadataBatchDefaultsConfig"];
            metadataServers: components["schemas"]["MetadataServer"][];
            scrapeApplyDefaults: components["schemas"]["ScrapeApplyDefaultsConfig"];
            scraperDirectories: string[];
            scraperPreferences: components["schemas"]["ScraperPreference"][];
        };
        SecurityConfig: {
            allowAnonymousShareLinks: boolean;
            enabled: boolean;
            enforceDefaultDeny: boolean;
            knownProxies?: string[];
            newPassword?: string;
            trustedHosts?: string[];
            username?: string;
        };
        Segment: {
            colorHint?: string;
            /** Format: float */
            confidence?: number;
            createdAt: string;
            /** Format: double */
            endSec?: number;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /** Format: int32 */
            hostId: number;
            hostType: components["schemas"]["SegmentHostType"];
            /** Format: int32 */
            id: number;
            kind?: string;
            payload?: null | components["schemas"]["JsonElement"];
            /** Format: int64 */
            refId?: number;
            sourceKey: string;
            sourceRunId?: string;
            /** Format: double */
            startSec: number;
            /** Format: int32 */
            tagId?: number;
            tagName?: string;
            title?: string;
            updatedAt: string;
        };
        SegmentCreate: {
            colorHint?: string;
            /** Format: float */
            confidence?: number;
            /** Format: double */
            endSec?: number;
            kind?: string;
            payload?: null | components["schemas"]["JsonElement"];
            /** Format: int64 */
            refId?: number;
            sourceKey?: string;
            sourceRunId?: string;
            /** Format: double */
            startSec: number;
            /** Format: int32 */
            tagId?: number;
            title?: string;
        };
        SegmentDisplayProfile: {
            createdAt: string;
            description?: string;
            /** Format: int32 */
            id: number;
            isDefault: boolean;
            isSystem: boolean;
            name: string;
            updatedAt: string;
            /** Format: int32 */
            userId?: number;
            /** Format: int32 */
            version: number;
        };
        SegmentDisplayProfileCreate: {
            description?: string;
            isDefault: boolean;
            name: string;
        };
        SegmentDisplayProfilePreviewRequest: {
            rules: components["schemas"]["SegmentDisplayRuleCreate"][];
            /** Format: int32 */
            videoId: number;
        };
        SegmentDisplayProfileUpdate: {
            description?: string;
            name: string;
        };
        SegmentDisplayRule: {
            collapseToInstant: boolean;
            colorOverride?: string;
            createdAt: string;
            hostType?: null | components["schemas"]["SegmentHostType"];
            /** Format: int32 */
            id: number;
            kind?: string;
            /** Format: int32 */
            lane?: number;
            /** Format: double */
            mergeGapSec?: number;
            /** Format: float */
            minConfidence?: number;
            /** Format: double */
            minDurationSec?: number;
            /** Format: int32 */
            priority?: number;
            sourceKey?: string;
            tagCategory?: string;
            /** Format: int32 */
            tagId?: number;
            tagName?: string;
            updatedAt: string;
            /** Format: int32 */
            userId?: number;
            visible: boolean;
        };
        SegmentDisplayRuleCreate: {
            collapseToInstant: boolean;
            colorOverride?: string;
            hostType?: null | components["schemas"]["SegmentHostType"];
            kind?: string;
            /** Format: int32 */
            lane?: number;
            /** Format: double */
            mergeGapSec?: number;
            /** Format: float */
            minConfidence?: number;
            /** Format: double */
            minDurationSec?: number;
            /** Format: int32 */
            priority?: number;
            sourceKey?: string;
            tagCategory?: string;
            /** Format: int32 */
            tagId?: number;
            visible: boolean;
        };
        SegmentDisplayRuleUpdate: {
            collapseToInstant: boolean;
            colorOverride?: string;
            hostType?: null | components["schemas"]["SegmentHostType"];
            kind?: string;
            /** Format: int32 */
            lane?: number;
            /** Format: double */
            mergeGapSec?: number;
            /** Format: float */
            minConfidence?: number;
            /** Format: double */
            minDurationSec?: number;
            /** Format: int32 */
            priority?: number;
            sourceKey?: string;
            tagCategory?: string;
            /** Format: int32 */
            tagId?: number;
            visible: boolean;
        };
        SegmentDistinctValue: {
            /** Format: int32 */
            count: number;
            value: string;
        };
        /** @enum {unknown} */
        SegmentHostType: "video" | "image" | "audio" | null;
        SegmentRecord: {
            colorHint?: string;
            /** Format: float */
            confidence?: number;
            createdAt: string;
            /** Format: double */
            endSec?: number;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /** Format: int32 */
            hostId: number;
            hostTitle?: string;
            hostType: components["schemas"]["SegmentHostType"];
            /** Format: int32 */
            id: number;
            kind?: string;
            payload?: null | components["schemas"]["JsonElement"];
            /** Format: int32 */
            performerId?: number;
            performerName?: string;
            /** Format: int64 */
            refId?: number;
            refLabel?: string;
            sourceKey: string;
            sourceRunId?: string;
            /** Format: double */
            startSec: number;
            /** Format: int32 */
            tagId?: number;
            tagName?: string;
            title?: string;
            updatedAt: string;
        };
        SegmentSpanCountResponse: {
            /** Format: int32 */
            totalCount: number;
        };
        SegmentSpanDerivedQuery: {
            /** Format: double */
            mergeGapSec?: number;
            /** Format: double */
            minDurationSec?: number;
            operands: components["schemas"]["SegmentSpanOperand"][];
            operator: string;
        };
        SegmentSpanOperand: {
            kind?: string;
            /** Format: float */
            minConfidence?: number;
            refIds?: number[];
            sourceKey?: string;
            tagIds?: number[];
        };
        SegmentSpanQueryRequest: {
            /** Format: double */
            mergeGapSec?: number;
            /** Format: double */
            minDurationSec?: number;
            operands: components["schemas"]["SegmentSpanOperand"][];
            operator: string;
            /** Format: int32 */
            profile?: number;
        };
        SegmentSpanSearchRequest: {
            colorHint?: string;
            colorHintModifier?: string;
            /** Format: float */
            confidence?: number;
            /** Format: float */
            confidence2?: number;
            confidenceModifier?: string;
            createdAt?: string;
            createdAt2?: string;
            createdAtModifier?: string;
            derivedQuery?: null | components["schemas"]["SegmentSpanDerivedQuery"];
            direction?: string;
            durationModifier?: string;
            /** Format: double */
            durationSec?: number;
            /** Format: double */
            durationSec2?: number;
            /** Format: double */
            endSec?: number;
            /** Format: double */
            endSec2?: number;
            endSecModifier?: string;
            excludeVideoIds?: number[];
            hasImage?: boolean;
            hasPayload?: boolean;
            hostType?: string;
            kind?: string;
            /** Format: int32 */
            page?: number;
            performerIds?: number[];
            /** Format: int32 */
            perPage?: number;
            /** Format: int32 */
            profile?: number;
            q?: string;
            refIds?: number[];
            /** Format: int32 */
            seed?: number;
            sort?: string;
            sourceCategory?: string;
            sourceKey?: string;
            sourceRunId?: string;
            sourceRunIdModifier?: string;
            /** Format: double */
            startSec?: number;
            /** Format: double */
            startSec2?: number;
            startSecModifier?: string;
            tagIds?: number[];
            title?: string;
            titleModifier?: string;
            updatedAt?: string;
            updatedAt2?: string;
            updatedAtModifier?: string;
            videoIds?: number[];
            videoTitle?: string;
        };
        SegmentSpanSearchResponse: {
            /** @default false */
            hasMore: boolean;
            items: components["schemas"]["SegmentSpanSearchResultItem"][];
            /** Format: int32 */
            page: number;
            /** Format: int32 */
            perPage: number;
            /** Format: int32 */
            totalCount: number;
        };
        SegmentSpanSearchResultItem: {
            /** Format: int32 */
            profileId: number;
            span: components["schemas"]["ResolvedSpan"];
            /** Format: int32 */
            videoId: number;
            videoTitle?: string;
            videoUpdatedAt?: string;
        };
        SegmentTagBulkRemoveRequest: {
            ids?: number[];
            /** Format: int32 */
            tagId: number;
        };
        SegmentUpdate: {
            colorHint?: string;
            /** Format: float */
            confidence?: number;
            /** Format: double */
            endSec?: number;
            kind?: string;
            payload?: null | components["schemas"]["JsonElement"];
            /** Format: int64 */
            refId?: number;
            sourceKey: string;
            sourceRunId?: string;
            /** Format: double */
            startSec: number;
            /** Format: int32 */
            tagId?: number;
            title?: string;
        };
        SetLogLevelRequest: {
            level?: string;
        };
        SetRolesRequest: {
            roles: string[];
        };
        /** @enum {string} */
        SettingsTabLayout: "panels" | "page";
        SetupTokenRedeemRequest: {
            password: string;
            token: string;
            username?: string;
        };
        /** @enum {string} */
        SortDirection: "asc" | "desc";
        StashImportResult: {
            /** Format: int32 */
            galleries: number;
            /** Format: int32 */
            groups: number;
            /** Format: int32 */
            images: number;
            /** Format: int32 */
            performers: number;
            /** Format: int32 */
            studios: number;
            /** Format: int32 */
            tags: number;
            /** Format: int32 */
            videos: number;
        };
        StashPreviewResult: {
            error?: string;
            /** Format: int32 */
            galleries: number;
            /** @default false */
            generatedContentFound: boolean;
            generatedPath?: string;
            /** Format: int32 */
            groups: number;
            /** Format: int32 */
            images: number;
            isValid: boolean;
            /** Format: int32 */
            performers: number;
            /** Format: int32 */
            studios: number;
            /** Format: int32 */
            tags: number;
            /** Format: int32 */
            videos: number;
        };
        Stats: {
            /** Format: int32 */
            aiRunCount: number;
            /** Format: int64 */
            audioCompleteCount: number;
            /** Format: double */
            audioConsumedSeconds: number;
            /** Format: int32 */
            audioCount: number;
            /** Format: double */
            audioDuration: number;
            /** Format: int64 */
            audioFileSize: number;
            /** Format: int64 */
            audioPlayCount: number;
            /** Format: int32 */
            detectionCount: number;
            /** Format: int32 */
            embeddingCount: number;
            /** Format: int32 */
            faceAppearanceCount: number;
            /** Format: int32 */
            faceCount: number;
            /** Format: int32 */
            galleryCount: number;
            /** Format: int32 */
            groupCount: number;
            /** Format: int64 */
            imageCompleteCount: number;
            /** Format: double */
            imageConsumedSeconds: number;
            /** Format: int32 */
            imageCount: number;
            /** Format: int64 */
            imageFileSize: number;
            /** Format: int64 */
            imageViewCount: number;
            /** Format: int32 */
            performerCount: number;
            /** Format: int64 */
            segmentCompleteCount: number;
            /** Format: double */
            segmentConsumedSeconds: number;
            /** Format: int32 */
            segmentCount: number;
            /** Format: int64 */
            segmentViewCount: number;
            /** Format: int32 */
            studioCount: number;
            /** Format: int32 */
            tagApplicationCount: number;
            /** Format: int32 */
            tagCount: number;
            /** Format: int64 */
            textCompleteCount: number;
            /** Format: double */
            textConsumedSeconds: number;
            /** Format: int32 */
            textCount: number;
            /** Format: int64 */
            textFileSize: number;
            /** Format: int64 */
            textReadCount: number;
            /** Format: int64 */
            totalDerivedLikes: number;
            /** Format: int64 */
            totalFavorites: number;
            /** Format: int64 */
            totalFileSize: number;
            /** Format: int64 */
            totalLikes: number;
            /** Format: double */
            totalPlayDuration: number;
            /** Format: int64 */
            videoCompleteCount: number;
            /** Format: double */
            videoConsumedSeconds: number;
            /** Format: int32 */
            videoCount: number;
            /** Format: double */
            videoDuration: number;
            /** Format: int64 */
            videoFileSize: number;
            /** Format: int64 */
            videoPlayCount: number;
        };
        StringCriterion: {
            modifier?: components["schemas"]["CriterionModifier"];
            value: string;
        };
        Studio: {
            aliases: string[];
            /** Format: int32 */
            audioCount: number;
            /** Format: int32 */
            childStudioCount: number;
            createdAt: string;
            customFields?: Record<string, never>;
            details?: string;
            favorite: boolean;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /** Format: int32 */
            galleryCount: number;
            /** Format: int32 */
            groupCount: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageCount: number;
            imagePath?: string;
            name: string;
            organized: boolean;
            /** Format: int32 */
            parentId?: number;
            parentName?: string;
            /** Format: int32 */
            performerCount: number;
            remoteIds: components["schemas"]["StudioRemoteId"][];
            tags: components["schemas"]["Tag"][];
            /** Format: int32 */
            textCount: number;
            updatedAt: string;
            urls: string[];
            /** Format: int32 */
            videoCount: number;
        };
        StudioCreate: {
            aliases?: string[];
            customFields?: Record<string, never>;
            details?: string;
            favorite: boolean;
            name: string;
            organized: boolean;
            /** Format: int32 */
            parentId?: number;
            /** Format: int32 */
            rating?: number;
            remoteIds?: components["schemas"]["StudioRemoteId"][];
            tagIds?: number[];
            urls?: string[];
        };
        StudioFilter: {
            aliasesCriterion?: null | components["schemas"]["StringCriterion"];
            childCountCriterion?: null | components["schemas"]["IntCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            detailsCriterion?: null | components["schemas"]["StringCriterion"];
            favorite?: boolean;
            favoriteCriterion?: null | components["schemas"]["BoolCriterion"];
            galleryCountCriterion?: null | components["schemas"]["IntCriterion"];
            groupCountCriterion?: null | components["schemas"]["IntCriterion"];
            imageCountCriterion?: null | components["schemas"]["IntCriterion"];
            isMissingCriterion?: null | components["schemas"]["BoolCriterion"];
            name?: string;
            nameCriterion?: null | components["schemas"]["StringCriterion"];
            organizedCriterion?: null | components["schemas"]["BoolCriterion"];
            parentCountCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            parentId?: number;
            parentsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCountCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCriterion?: null | components["schemas"]["StringCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagIds?: number[];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
            videoCountCriterion?: null | components["schemas"]["IntCriterion"];
        };
        StudioMerge: {
            sourceIds: number[];
            /** Format: int32 */
            targetId: number;
        };
        StudioRemoteId: {
            endpoint: string;
            remoteId: string;
        };
        StudioUpdate: {
            aliases?: string[];
            customFields?: Record<string, never>;
            details?: string;
            favorite?: boolean;
            name?: string;
            organized?: boolean;
            /** Format: int32 */
            parentId?: number;
            /** Format: int32 */
            rating?: number;
            remoteIds?: components["schemas"]["StudioRemoteId"][];
            tagIds?: number[];
            urls?: string[];
        };
        SyncFingerprintsOptions: {
            apiKey?: string;
            sourceUrl?: string;
        };
        SystemStatus: {
            appDir?: string;
            /** @default false */
            authEnabled: boolean;
            configFile?: string;
            databasePath: string;
            /** @default false */
            migrationRequired: boolean;
            migrationStatusError?: string;
            /** @default false */
            migrationStatusUnknown: boolean;
            pendingMigrations?: string[];
            version: string;
        };
        Tag: {
            aliases: string[];
            /** @default true */
            canRemove: boolean;
            /** @default false */
            canReportIncorrect: boolean;
            color?: string;
            customFields?: Record<string, never>;
            description?: string;
            /** Format: double */
            effectiveDurationPercent?: number;
            /** Format: double */
            effectiveDurationSec?: number;
            favorite: boolean;
            /** Format: int32 */
            id: number;
            /** @default false */
            isDerived: boolean;
            /** Format: double */
            minOccurrencePercent?: number;
            /** Format: double */
            minOccurrenceSec?: number;
            name: string;
            /** @default false */
            organized: boolean;
            provenance?: components["schemas"]["TagProvenance"][];
            segmentColorOverride?: string;
            /** Format: int32 */
            segmentLaneOverride?: number;
            showAsSegment?: boolean;
            tagGroupColor?: string;
            /** Format: int32 */
            tagGroupId?: number;
            tagGroupName?: string;
        };
        TagApplication: {
            appliedAt: string;
            /** Format: float */
            confidence?: number;
            /** Format: int32 */
            contextId?: number;
            contextType?: string;
            /** Format: double */
            hostDurationSec?: number;
            /** Format: int32 */
            hostId: number;
            hostType: string;
            /** Format: int32 */
            id: number;
            modelKey?: string;
            sourceKey: string;
            sourceRunId?: string;
            tag: components["schemas"]["Tag"];
            /** Format: double */
            totalDurationSec?: number;
        };
        TagApplicationCreate: {
            /** Format: float */
            confidence?: number;
            /** Format: int32 */
            contextId?: number;
            contextType?: string;
            /** Format: double */
            hostDurationSec?: number;
            /** Format: int32 */
            hostId: number;
            hostType: string;
            modelKey?: string;
            /** @default user */
            sourceKey: string;
            sourceRunId?: string;
            /** Format: int32 */
            tagId: number;
            /** Format: double */
            totalDurationSec?: number;
        };
        TagCreate: {
            aliases?: string[];
            childIds?: number[];
            color?: string;
            customFields?: Record<string, never>;
            description?: string;
            favorite: boolean;
            /** Format: double */
            minOccurrencePercent?: number;
            /** Format: double */
            minOccurrenceSec?: number;
            name: string;
            /** @default false */
            organized: boolean;
            parentIds?: number[];
            remoteIds?: components["schemas"]["TagRemoteId"][];
            segmentColorOverride?: string;
            /** Format: int32 */
            segmentLaneOverride?: number;
            showAsSegment?: boolean;
            sortName?: string;
            /** Format: int32 */
            tagGroupId?: number;
        };
        TagDetail: {
            aliases: string[];
            /** Format: int32 */
            audioCount: number;
            children: components["schemas"]["Tag"][];
            color?: string;
            createdAt: string;
            customFields?: Record<string, never>;
            description?: string;
            favorite: boolean;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /** Format: int32 */
            galleryCount: number;
            /** Format: int32 */
            groupCount: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageCount: number;
            /** Format: double */
            minOccurrencePercent?: number;
            /** Format: double */
            minOccurrenceSec?: number;
            name: string;
            /** @default false */
            organized: boolean;
            parents: components["schemas"]["Tag"][];
            /** Format: int32 */
            performerCount: number;
            remoteIds?: components["schemas"]["TagRemoteId"][];
            segmentColorOverride?: string;
            /** Format: int32 */
            segmentCount: number;
            /** Format: int32 */
            segmentLaneOverride?: number;
            showAsSegment?: boolean;
            sortName?: string;
            /** Format: int32 */
            studioCount: number;
            tagGroupColor?: string;
            /** Format: int32 */
            tagGroupId?: number;
            tagGroupName?: string;
            /** Format: int32 */
            textCount: number;
            updatedAt: string;
            /** Format: int32 */
            videoCount: number;
        };
        TagDurationClause: {
            contextMode: string;
            contextType?: string;
            modifier?: components["schemas"]["CriterionModifier"];
            /** Format: int32 */
            tagId?: number;
            unit: string;
            /** Format: double */
            value?: number;
            /** Format: double */
            value2?: number;
        };
        TagDurationCriterion: {
            clauses: components["schemas"]["TagDurationClause"][];
            contextMode: string;
            contextType?: string;
            modifier?: components["schemas"]["CriterionModifier"];
            /** Format: int32 */
            tagId?: number;
            unit: string;
            /** Format: double */
            value?: number;
            /** Format: double */
            value2?: number;
        };
        TagFilter: {
            aliasesCriterion?: null | components["schemas"]["StringCriterion"];
            childCountCriterion?: null | components["schemas"]["IntCriterion"];
            childrenCriterion?: null | components["schemas"]["MultiIdCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            descriptionCriterion?: null | components["schemas"]["StringCriterion"];
            favorite?: boolean;
            favoriteCriterion?: null | components["schemas"]["BoolCriterion"];
            galleryCountCriterion?: null | components["schemas"]["IntCriterion"];
            galleryCountIncludesChildren?: boolean;
            groupCountCriterion?: null | components["schemas"]["IntCriterion"];
            groupCountIncludesChildren?: boolean;
            imageCountCriterion?: null | components["schemas"]["IntCriterion"];
            imageCountIncludesChildren?: boolean;
            isMissingCriterion?: null | components["schemas"]["BoolCriterion"];
            name?: string;
            nameCriterion?: null | components["schemas"]["StringCriterion"];
            parentCountCriterion?: null | components["schemas"]["IntCriterion"];
            parentsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            performerCountCriterion?: null | components["schemas"]["IntCriterion"];
            performerCountIncludesChildren?: boolean;
            /** Format: int32 */
            rating?: number;
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCountCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCriterion?: null | components["schemas"]["StringCriterion"];
            remoteIdValueCriterion?: null | components["schemas"]["StringCriterion"];
            sortNameCriterion?: null | components["schemas"]["StringCriterion"];
            studioCountCriterion?: null | components["schemas"]["IntCriterion"];
            studioCountIncludesChildren?: boolean;
            tagGroupsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            videoCountCriterion?: null | components["schemas"]["IntCriterion"];
            videoCountIncludesChildren?: boolean;
        };
        TagGraphLink: {
            /** Format: int32 */
            sourceId: number;
            /** Format: int32 */
            targetId: number;
        };
        TagGraphNode: {
            childIds: number[];
            description?: string;
            favorite: boolean;
            /** Format: int32 */
            galleryCount: number;
            /** Format: int32 */
            groupCount: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageCount: number;
            imagePath?: string;
            name: string;
            parentIds: number[];
            /** Format: int32 */
            performerCount: number;
            /** Format: int32 */
            segmentCount: number;
            /** Format: int32 */
            studioCount: number;
            tagGroupColor?: string;
            /** Format: int32 */
            tagGroupId?: number;
            tagGroupName?: string;
            /** Format: int32 */
            totalUsageCount: number;
            /** Format: int32 */
            videoCount: number;
        };
        TagGraphResponse: {
            items: components["schemas"]["TagGraphNode"][];
            links: components["schemas"]["TagGraphLink"][];
            /** Format: int32 */
            totalCount: number;
        };
        TagGroup: {
            color?: string;
            createdAt: string;
            description?: string;
            /** Format: int32 */
            id: number;
            name: string;
            /** Format: int32 */
            sortOrder: number;
            /** Format: int32 */
            tagCount: number;
            updatedAt: string;
        };
        TagGroupCreate: {
            color?: string;
            description?: string;
            name: string;
            /** Format: int32 */
            sortOrder?: number;
        };
        TagGroupUpdate: {
            color?: string;
            description?: string;
            name?: string;
            /** Format: int32 */
            sortOrder?: number;
        };
        TagList: {
            aliases: string[];
            color?: string;
            description?: string;
            favorite: boolean;
            /** Format: int32 */
            galleryCount: number;
            /** Format: int32 */
            groupCount: number;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            imageCount: number;
            imagePath?: string;
            /** Format: double */
            minOccurrencePercent?: number;
            /** Format: double */
            minOccurrenceSec?: number;
            name: string;
            /** @default false */
            organized: boolean;
            /** Format: int32 */
            performerCount: number;
            segmentColorOverride?: string;
            /** Format: int32 */
            segmentCount: number;
            /** Format: int32 */
            segmentLaneOverride?: number;
            showAsSegment?: boolean;
            /** Format: int32 */
            studioCount: number;
            tagGroupColor?: string;
            /** Format: int32 */
            tagGroupId?: number;
            tagGroupName?: string;
            /** Format: int32 */
            videoCount: number;
        };
        TagMerge: {
            sourceIds: number[];
            /** Format: int32 */
            targetId: number;
        };
        TagProvenance: {
            appliedAt: string;
            /** Format: float */
            confidence?: number;
            /** Format: int32 */
            contextId?: number;
            contextType?: string;
            /** Format: double */
            hostDurationSec?: number;
            modelKey?: string;
            sourceKey: string;
            sourceRunId?: string;
            /** Format: double */
            totalDurationSec?: number;
        };
        TagRemoteId: {
            endpoint: string;
            remoteId: string;
        };
        TagSegmentWall: {
            /** Format: float */
            confidence?: number;
            /** Format: double */
            endSec?: number;
            /** Format: int32 */
            id: number;
            kind: string;
            sourceKey: string;
            /** Format: double */
            startSec: number;
            title?: string;
            /** Format: int32 */
            videoId: number;
            videoTitle: string;
        };
        TagUpdate: {
            aliases?: string[];
            childIds?: number[];
            color?: string;
            customFields?: Record<string, never>;
            description?: string;
            favorite?: boolean;
            /** Format: double */
            minOccurrencePercent?: number;
            /** Format: double */
            minOccurrenceSec?: number;
            name?: string;
            organized?: boolean;
            parentIds?: number[];
            remoteIds?: components["schemas"]["TagRemoteId"][];
            segmentColorOverride?: string;
            /** Format: int32 */
            segmentLaneOverride?: number;
            showAsSegment?: boolean;
            sortName?: string;
            /** Format: int32 */
            tagGroupId?: number;
        };
        TextContent: {
            content: string;
            format: string;
            renderMode: string;
        };
        TextDocument: {
            code?: string;
            contextTagApplications?: components["schemas"]["TagApplication"][];
            createdAt: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            /** Format: int32 */
            fileCount: number;
            files: components["schemas"]["TextFile"][];
            groups: components["schemas"]["GroupSummary"][];
            /** Format: int32 */
            id: number;
            imagePath?: string;
            /** Format: int32 */
            maxPageCount?: number;
            /** Format: int32 */
            maxWordCount?: number;
            organized: boolean;
            performers: components["schemas"]["PerformerSummary"][];
            /** Format: int32 */
            studioId?: number;
            studioName?: string;
            tags: components["schemas"]["Tag"][];
            title?: string;
            updatedAt: string;
            urls: string[];
        };
        TextDocumentCreate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            groupIds?: components["schemas"]["VideoGroupInput"][];
            organized: boolean;
            performerIds?: number[];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        TextDocumentFilter: {
            codeCriterion?: null | components["schemas"]["StringCriterion"];
            contentCriterion?: null | components["schemas"]["StringCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            dateCriterion?: null | components["schemas"]["DateCriterion"];
            detailsCriterion?: null | components["schemas"]["StringCriterion"];
            fileCountCriterion?: null | components["schemas"]["IntCriterion"];
            fileModTimeCriterion?: null | components["schemas"]["TimestampCriterion"];
            fileSizeCriterion?: null | components["schemas"]["IntCriterion"];
            formatCriterion?: null | components["schemas"]["StringCriterion"];
            groupsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            hasCoverCriterion?: null | components["schemas"]["BoolCriterion"];
            lastReadAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            likeCounterCriterion?: null | components["schemas"]["IntCriterion"];
            organizedCriterion?: null | components["schemas"]["BoolCriterion"];
            pageCountCriterion?: null | components["schemas"]["IntCriterion"];
            pathCriterion?: null | components["schemas"]["StringCriterion"];
            performerCountCriterion?: null | components["schemas"]["IntCriterion"];
            performersCriterion?: null | components["schemas"]["MultiIdCriterion"];
            performerTagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            playCountCriterion?: null | components["schemas"]["IntCriterion"];
            playDurationCriterion?: null | components["schemas"]["IntCriterion"];
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            studiosCriterion?: null | components["schemas"]["MultiIdCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            titleCriterion?: null | components["schemas"]["StringCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
            wordCountCriterion?: null | components["schemas"]["IntCriterion"];
        };
        TextDocumentUpdate: {
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            groupIds?: components["schemas"]["VideoGroupInput"][];
            organized?: boolean;
            performerIds?: number[];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        TextFile: {
            basename: string;
            excerptText?: string;
            format: string;
            /** Format: int32 */
            id: number;
            /** Format: int32 */
            pageCount?: number;
            path: string;
            /** Format: int64 */
            size: number;
            /** Format: int32 */
            wordCount?: number;
        };
        TimestampCriterion: {
            modifier?: components["schemas"]["CriterionModifier"];
            value: string;
            value2?: string;
        };
        UIComponentOverride: {
            componentName: string;
            extensionId: string;
            /**
             * Format: int32
             * @default 100
             */
            priority: number;
            targetComponent: string;
        };
        UIComponentStyleDef: {
            description?: string;
            id: string;
            name: string;
        };
        UiConfig: {
            abbreviateCounters: boolean;
            alwaysResumeOnPlayback: boolean;
            autoplayOnListClick: boolean;
            autostartVideo: boolean;
            autostartVideoOnPlaySelected: boolean;
            continuePlaylistDefault: boolean;
            customCss?: string;
            customJs?: string;
            customLocalesPath?: string;
            deleteFileDefault: boolean;
            enableCSSCustomization: boolean;
            enableJSCustomization: boolean;
            faviconPath?: string;
            feedVideoSound: boolean;
            feedVideoSource: string;
            /** Format: double */
            feedVideoStartMinDuration: number;
            /** Format: double */
            feedVideoStartPercent: number;
            imageObjectFit: string;
            keybindingOverrides: {
                [key: string]: string;
            };
            logoPath?: string;
            /** Format: int32 */
            maxLoopDuration: number;
            noBrowser: boolean;
            notificationsEnabled: boolean;
            /** Format: double */
            playerVideoStartMinDuration: number;
            /** Format: double */
            playerVideoStartPercent: number;
            previewExcludeEnd: string;
            previewExcludeStart: string;
            /** Format: double */
            previewSegmentDuration: number;
            /** Format: int32 */
            previewSegments: number;
            ratingSystemOptions: components["schemas"]["RatingSystemOptions"];
            showAbLoopControls: boolean;
            showStudioAsText: boolean;
            /** Format: int32 */
            slideshowDelay: number;
            soundOnPreview: boolean;
            title?: string;
            troubleshootingModeEnabled: boolean;
            videoObjectFit: string;
            /** Format: int32 */
            wallPlayback: number;
            wallPreviewType: string;
            wallShowTitle: boolean;
        };
        UIDialogOverride: {
            componentName: string;
            dialogId: string;
            extensionId: string;
            /**
             * Format: int32
             * @default 100
             */
            priority: number;
        };
        UIFeatureDefinition: {
            extensionId: string;
            key: string;
            options?: {
                [key: string]: string;
            };
        };
        UILayoutStyleDef: {
            description?: string;
            id: string;
            name: string;
        };
        UIListFilterContribution: {
            criterionType: string;
            customFieldKey?: string;
            customFieldType?: string;
            entityReferenceType?: string;
            entityType: string;
            extensionId: string;
            filterKey?: string;
            id: string;
            label: string;
            modifiers?: string[];
            options?: components["schemas"]["UIListFilterOption"][];
            /**
             * Format: int32
             * @default 100
             */
            order: number;
        };
        UIListFilterOption: {
            label: string;
            value: string;
        };
        UIListSortContribution: {
            customFieldKey?: string;
            customFieldType?: string;
            entityType: string;
            extensionId: string;
            id: string;
            label: string;
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            sortKey?: string;
        };
        UIManifest: {
            actions: components["schemas"]["ExtensionAction"][];
            componentOverrides: components["schemas"]["UIComponentOverride"][];
            componentStyles: components["schemas"]["UIComponentStyleDef"][];
            cssBundleUrl?: string;
            dialogOverrides: components["schemas"]["UIDialogOverride"][];
            features: components["schemas"]["UIFeatureDefinition"][];
            frontendRuntimeVersion?: string;
            jsBundleUrl?: string;
            layoutStyles: components["schemas"]["UILayoutStyleDef"][];
            listFilters: components["schemas"]["UIListFilterContribution"][];
            listSorts: components["schemas"]["UIListSortContribution"][];
            pageOverrides: components["schemas"]["UIPageOverride"][];
            pages: components["schemas"]["UIPageDefinition"][];
            panes: components["schemas"]["UIPaneContribution"][];
            selectorOverrides: components["schemas"]["UISelectorOverride"][];
            settingsPanels: components["schemas"]["UISettingsPanel"][];
            settingsTabs: components["schemas"]["UISettingsTab"][];
            slots: components["schemas"]["UISlotContribution"][];
            tabs: components["schemas"]["UITabContribution"][];
            themes: components["schemas"]["UIThemeDefinition"][];
            tutorialTopics: components["schemas"]["UITutorialTopic"][];
        };
        UIPageDefinition: {
            componentName?: string;
            detailRoute?: string;
            extensionId?: string;
            icon?: string;
            label: string;
            /**
             * Format: int32
             * @default 100
             */
            navOrder: number;
            requiredPermission?: string;
            route: string;
            /** @default true */
            showInNav: boolean;
        };
        UIPageOverride: {
            componentName: string;
            extensionId: string;
            /**
             * Format: int32
             * @default 100
             */
            priority: number;
            targetPage: string;
        };
        UIPaneContribution: {
            componentName: string;
            extensionId: string;
            id: string;
            label?: string;
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            pageType: string;
            zone: string;
        };
        UISelectorOverride: {
            componentName: string;
            extensionId: string;
            /**
             * Format: int32
             * @default 100
             */
            priority: number;
            selectorKey: string;
        };
        UISettingsPanel: {
            componentName: string;
            extensionId: string;
            id: string;
            label: string;
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            targetSection?: string;
            targetTab?: string;
        };
        UISettingsTab: {
            aliases?: string[];
            description?: string;
            extensionId: string;
            icon?: string;
            key: string;
            label: string;
            layout: components["schemas"]["SettingsTabLayout"];
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            parentTabKey?: string;
            searchKeywords?: string[];
        };
        UISlotContribution: {
            componentName?: string;
            /** @default component */
            contentType: string;
            extensionId: string;
            html?: string;
            id: string;
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            slot: string;
        };
        UITabContribution: {
            componentName: string;
            countEndpoint?: string;
            extensionId: string;
            icon?: string;
            key: string;
            label: string;
            manualContexts?: string[];
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            pageType: string;
        };
        UIThemeDefinition: {
            backgroundAnimation?: string;
            colorScheme?: string;
            componentStyle?: string;
            cssUrl?: string;
            cssVariables?: {
                [key: string]: string;
            };
            description?: string;
            id: string;
            layoutStyle?: string;
            name: string;
        };
        UITutorialLink: {
            label: string;
            url: string;
        };
        UITutorialSlide: {
            bodyMarkdown?: string;
            caption?: string;
            id: string;
            imageAlt?: string;
            imageSrc?: string;
            links?: components["schemas"]["UITutorialLink"][];
            mockKind?: string;
            points?: string[];
            title: string;
        };
        UITutorialTopic: {
            contexts?: string[];
            description?: string;
            extensionId?: string;
            id: string;
            kind?: string;
            /**
             * Format: int32
             * @default 100
             */
            order: number;
            pages?: string[];
            parentTopicId?: string;
            slides?: components["schemas"]["UITutorialSlide"][];
            title: string;
        };
        UpdateContentRuleRequest: {
            appliesTo?: string;
            effect?: string;
            scopeKind?: string;
            scopeValue?: string;
        };
        UpdateRoleRequest: {
            description?: string;
            permissions?: string[];
        };
        UpdateUserRequest: {
            displayName?: string;
            email?: string;
            isActive?: boolean;
            mustChangePassword?: boolean;
        };
        UserPlaybackPreferences: {
            /** Format: int32 */
            skipSeconds?: number;
        };
        UserRatingSystemOptions: {
            starPrecision?: string;
            type?: string;
        };
        UserThemePreferences: {
            activeComponentStyles?: string[];
            activeLayoutStyle?: string;
            activeThemeId?: string;
            customThemeColors?: {
                [key: string]: string;
            };
            styleOptions?: {
                [key: string]: {
                    [key: string]: string;
                };
            };
        };
        UserTrackingPreferences: {
            /** Format: int32 */
            dwellPositiveSec?: number;
            enabled?: boolean;
            /** Format: int32 */
            minDerivedLikeSessionSeconds?: number;
            /** Format: int32 */
            minImageDetailViewSeconds?: number;
            /** Format: int32 */
            minViewSeconds?: number;
            /** Format: int32 */
            sessionIdleTimeoutSec?: number;
            /** Format: double */
            viewCompletionRatio?: number;
        };
        UserUiPreferences: {
            defaultFilters?: {
                [key: string]: string;
            };
            homePageContent?: string;
            keybindingOverrides?: {
                [key: string]: string;
            };
            playback?: null | components["schemas"]["UserPlaybackPreferences"];
            ratingSystemOptions?: null | components["schemas"]["UserRatingSystemOptions"];
            theme?: null | components["schemas"]["UserThemePreferences"];
            tracking?: null | components["schemas"]["UserTrackingPreferences"];
            videos?: null | components["schemas"]["UserVideosPreferences"];
        };
        UserVideosPreferences: {
            includeCompilationGroups?: boolean;
        };
        Video: {
            captions?: string;
            /**
             * Format: int32
             * @default 0
             */
            childVideoCount: number;
            /** Format: double */
            clipEndSec?: number;
            /** Format: double */
            clipStartSec?: number;
            code?: string;
            contextTagApplications?: components["schemas"]["TagApplication"][];
            createdAt: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            director?: string;
            fieldProvenance?: components["schemas"]["FieldProvenance"][];
            files: components["schemas"]["VideoFile"][];
            galleries: components["schemas"]["GallerySummary"][];
            groups: components["schemas"]["GroupSummary"][];
            /** Format: int32 */
            id: number;
            imagePath?: string;
            isVr: boolean;
            organized: boolean;
            /** Format: int32 */
            parentVideoId?: number;
            parentVideoTitle?: string;
            performers: components["schemas"]["PerformerSummary"][];
            remoteIds: components["schemas"]["VideoRemoteId"][];
            /** Format: int32 */
            studioId?: number;
            studioName?: string;
            tags: components["schemas"]["Tag"][];
            title?: string;
            updatedAt: string;
            urls: string[];
        };
        VideoAssignFile: {
            /** Format: int32 */
            fileId: number;
        };
        VideoCreate: {
            captions?: string;
            /** Format: double */
            clipEndSec?: number;
            /** Format: double */
            clipStartSec?: number;
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            director?: string;
            galleryIds?: number[];
            groups?: components["schemas"]["VideoGroupInput"][];
            /** @default false */
            isVr: boolean;
            organized: boolean;
            /** Format: int32 */
            parentVideoId?: number;
            performerIds?: number[];
            /** Format: int32 */
            rating?: number;
            remoteIds?: components["schemas"]["VideoRemoteId"][];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        VideoFile: {
            audioCodec: string;
            basename: string;
            /** Format: int64 */
            bitRate: number;
            captions?: components["schemas"]["Caption"][];
            /** Format: double */
            duration: number;
            fingerprints: components["schemas"]["Fingerprint"][];
            format: string;
            /** Format: double */
            frameRate: number;
            /** Format: int32 */
            height: number;
            /** Format: int32 */
            id: number;
            path: string;
            /** Format: int64 */
            size: number;
            videoCodec: string;
            /** Format: int32 */
            width: number;
        };
        VideoFilter: {
            audioCodecCriterion?: null | components["schemas"]["StringCriterion"];
            bitrateInterval?: null | components["schemas"]["IntCriterion"];
            captionsCriterion?: null | components["schemas"]["StringCriterion"];
            checksumCriterion?: null | components["schemas"]["StringCriterion"];
            code?: string;
            codeCriterion?: null | components["schemas"]["StringCriterion"];
            createdAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            customFieldCriteria: components["schemas"]["CustomFieldCriterion"][];
            customFieldCriterion?: null | components["schemas"]["CustomFieldCriterion"];
            dateCriterion?: null | components["schemas"]["DateCriterion"];
            detailsCriterion?: null | components["schemas"]["StringCriterion"];
            directorCriterion?: null | components["schemas"]["StringCriterion"];
            duplicatedCriterion?: null | components["schemas"]["StringCriterion"];
            duplicatedPhashCriterion?: null | components["schemas"]["BoolCriterion"];
            duplicatedRemoteIdCriterion?: null | components["schemas"]["BoolCriterion"];
            duplicatedTitleCriterion?: null | components["schemas"]["BoolCriterion"];
            durationCriterion?: null | components["schemas"]["IntCriterion"];
            fileCountCriterion?: null | components["schemas"]["IntCriterion"];
            fingerprintCriterion?: null | components["schemas"]["FingerprintCriterion"];
            frameRateCriterion?: null | components["schemas"]["IntCriterion"];
            galleriesCriterion?: null | components["schemas"]["MultiIdCriterion"];
            /** Format: int32 */
            galleryId?: number;
            /** Format: int32 */
            groupId?: number;
            groupsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            hashCriterion?: null | components["schemas"]["StringCriterion"];
            ids?: number[];
            isMissingCriterion?: null | components["schemas"]["BoolCriterion"];
            isVr?: boolean;
            isVrCriterion?: null | components["schemas"]["BoolCriterion"];
            lastPlayedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            likeCounterCriterion?: null | components["schemas"]["IntCriterion"];
            organized?: boolean;
            organizedCriterion?: null | components["schemas"]["BoolCriterion"];
            orientationCriterion?: null | components["schemas"]["StringCriterion"];
            path?: string;
            pathCriterion?: null | components["schemas"]["StringCriterion"];
            performerAgeCriterion?: null | components["schemas"]["IntCriterion"];
            performerCountCriterion?: null | components["schemas"]["IntCriterion"];
            performerFavoriteCriterion?: null | components["schemas"]["BoolCriterion"];
            performerIds?: number[];
            performersCriterion?: null | components["schemas"]["MultiIdCriterion"];
            performerTagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            playCountCriterion?: null | components["schemas"]["IntCriterion"];
            playDurationCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            rating?: number;
            ratingCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCountCriterion?: null | components["schemas"]["IntCriterion"];
            remoteIdCriterion?: null | components["schemas"]["StringCriterion"];
            resolutionCriterion?: null | components["schemas"]["IntCriterion"];
            resumeTimeCriterion?: null | components["schemas"]["IntCriterion"];
            /** Format: int32 */
            studioId?: number;
            studiosCriterion?: null | components["schemas"]["MultiIdCriterion"];
            tagCountCriterion?: null | components["schemas"]["IntCriterion"];
            tagDurationCriterion?: null | components["schemas"]["TagDurationCriterion"];
            tagIds?: number[];
            tagsCriterion?: null | components["schemas"]["MultiIdCriterion"];
            title?: string;
            titleCriterion?: null | components["schemas"]["StringCriterion"];
            updatedAtCriterion?: null | components["schemas"]["TimestampCriterion"];
            urlCriterion?: null | components["schemas"]["StringCriterion"];
            videoCodecCriterion?: null | components["schemas"]["StringCriterion"];
        };
        VideoGroupInput: {
            /** Format: int32 */
            groupId: number;
            /**
             * Format: int32
             * @default 0
             */
            videoIndex: number;
        };
        VideoHistory: {
            allTimeWatchedIntervals?: components["schemas"]["PlaybackInterval"][];
            events?: components["schemas"]["InteractionEvent"][];
            likeHistory: string[];
            playHistory: string[];
            sessions?: components["schemas"]["VideoPlaybackSession"][];
            /** Format: double */
            totalDistinctWatchedSec?: number;
        };
        VideoListEntry: {
            group?: null | components["schemas"]["Group"];
            /** Format: int32 */
            id: number;
            kind: string;
            video?: null | components["schemas"]["Video"];
        };
        VideoMerge: {
            sourceIds: number[];
            /** Format: int32 */
            targetId: number;
        };
        VideoPlaybackSession: {
            endedAt?: string;
            intervals: components["schemas"]["PlaybackInterval"][];
            isCompleted: boolean;
            /** Format: double */
            lastPositionSec?: number;
            lastSeenAt: string;
            /** Format: double */
            mediaDurationSec: number;
            /** Format: uuid */
            sessionId: string;
            startedAt: string;
            state: string;
            /** Format: double */
            totalWatchedSec: number;
        };
        VideoRating: {
            /** @default overall */
            aspect: string;
            /** Format: int32 */
            value?: number;
        };
        VideoRemoteId: {
            endpoint: string;
            remoteId: string;
        };
        VideoResolvedSpans: {
            /** Format: int32 */
            profileId: number;
            /** Format: int32 */
            profileVersion: number;
            spans: components["schemas"]["ResolvedSpan"][];
        };
        VideoUpdate: {
            captions?: string;
            /** Format: double */
            clipEndSec?: number;
            /** Format: double */
            clipStartSec?: number;
            code?: string;
            customFields?: Record<string, never>;
            date?: string;
            details?: string;
            director?: string;
            galleryIds?: number[];
            groups?: components["schemas"]["VideoGroupInput"][];
            isVr?: boolean;
            organized?: boolean;
            performerIds?: number[];
            /** Format: int32 */
            rating?: number;
            remoteIds?: components["schemas"]["VideoRemoteId"][];
            /** Format: int32 */
            studioId?: number;
            tagIds?: number[];
            title?: string;
            urls?: string[];
        };
        WipeResult: {
            backupPath: string;
            configBackupPath?: string;
            message: string;
            timestamp: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type AddSubGroup = components['schemas']['AddSubGroup'];
export type AdminPasswordRequest = components['schemas']['AdminPasswordRequest'];
export type AffinityHostType = components['schemas']['AffinityHostType'];
export type AiDataPurgeRequest = components['schemas']['AiDataPurgeRequest'];
export type AiDataPurgeResult = components['schemas']['AiDataPurgeResult'];
export type AiDataSelector = components['schemas']['AiDataSelector'];
export type AiDataSummary = components['schemas']['AiDataSummary'];
export type AiDataSummaryItem = components['schemas']['AiDataSummaryItem'];
export type AiRun = components['schemas']['AiRun'];
export type AiRunStatus = components['schemas']['AiRunStatus'];
export type AiRunTargetType = components['schemas']['AiRunTargetType'];
export type ApplyVideoScrapeAttempt = components['schemas']['ApplyVideoScrapeAttempt'];
export type Audio = components['schemas']['Audio'];
export type AudioCreate = components['schemas']['AudioCreate'];
export type AudioFile = components['schemas']['AudioFile'];
export type AudioFilter = components['schemas']['AudioFilter'];
export type AudioTrack = components['schemas']['AudioTrack'];
export type AudioUpdate = components['schemas']['AudioUpdate'];
export type BackupResult = components['schemas']['BackupResult'];
export type BatchDelete = components['schemas']['BatchDelete'];
export type Bookmark = components['schemas']['Bookmark'];
export type BookmarkBatchRequest = components['schemas']['BookmarkBatchRequest'];
export type BookmarkState = components['schemas']['BookmarkState'];
export type BookmarkToggle = components['schemas']['BookmarkToggle'];
export type BoolCriterion = components['schemas']['BoolCriterion'];
export type BootstrapOwnerRequest = components['schemas']['BootstrapOwnerRequest'];
export type BulkAudioUpdate = components['schemas']['BulkAudioUpdate'];
export type BulkGalleryUpdate = components['schemas']['BulkGalleryUpdate'];
export type BulkGroupUpdate = components['schemas']['BulkGroupUpdate'];
export type BulkImageUpdate = components['schemas']['BulkImageUpdate'];
export type BulkPerformerUpdate = components['schemas']['BulkPerformerUpdate'];
export type BulkStudioUpdate = components['schemas']['BulkStudioUpdate'];
export type BulkTagUpdate = components['schemas']['BulkTagUpdate'];
export type BulkTextDocumentUpdate = components['schemas']['BulkTextDocumentUpdate'];
export type BulkUpdateMode = components['schemas']['BulkUpdateMode'];
export type BulkVideoUpdate = components['schemas']['BulkVideoUpdate'];
export type Caption = components['schemas']['Caption'];
export type ChangePasswordRequest = components['schemas']['ChangePasswordRequest'];
export type CleanOptions = components['schemas']['CleanOptions'];
export type ConfigBackupResult = components['schemas']['ConfigBackupResult'];
export type CoveConfig = components['schemas']['CoveConfig'];
export type CovePath = components['schemas']['CovePath'];
export type CreateApiTokenRequest = components['schemas']['CreateApiTokenRequest'];
export type CreateContentRuleRequest = components['schemas']['CreateContentRuleRequest'];
export type CreateEntityOverrideRequest = components['schemas']['CreateEntityOverrideRequest'];
export type CreateInviteRequest = components['schemas']['CreateInviteRequest'];
export type CreateRoleRequest = components['schemas']['CreateRoleRequest'];
export type CreateScrapeAttempt = components['schemas']['CreateScrapeAttempt'];
export type CreateShareLinkRequest = components['schemas']['CreateShareLinkRequest'];
export type CreateUserRequest = components['schemas']['CreateUserRequest'];
export type CriterionModifier = components['schemas']['CriterionModifier'];
export type CustomFieldCriterion = components['schemas']['CustomFieldCriterion'];
export type CustomFieldDefinition = components['schemas']['CustomFieldDefinition'];
export type CustomFieldDefinitionCreate = components['schemas']['CustomFieldDefinitionCreate'];
export type CustomFieldDefinitionSync = components['schemas']['CustomFieldDefinitionSync'];
export type CustomFieldDefinitionUpdate = components['schemas']['CustomFieldDefinitionUpdate'];
export type DatabaseMigrationResult = components['schemas']['DatabaseMigrationResult'];
export type DateCriterion = components['schemas']['DateCriterion'];
export type DeleteFiles = components['schemas']['DeleteFiles'];
export type DependencyInfo = components['schemas']['DependencyInfo'];
export type DependencyProblem = components['schemas']['DependencyProblem'];
export type Detection = components['schemas']['Detection'];
export type DetectionCreate = components['schemas']['DetectionCreate'];
export type DetectionHostType = components['schemas']['DetectionHostType'];
export type DetectionUpdate = components['schemas']['DetectionUpdate'];
export type DirectoryEntry = components['schemas']['DirectoryEntry'];
export type DownloaderBatchFollowUp = components['schemas']['DownloaderBatchFollowUp'];
export type DownloaderBatchIssue = components['schemas']['DownloaderBatchIssue'];
export type DownloaderBatchItem = components['schemas']['DownloaderBatchItem'];
export type DownloaderBatchStartRequest = components['schemas']['DownloaderBatchStartRequest'];
export type DownloaderBatchStartResponse = components['schemas']['DownloaderBatchStartResponse'];
export type DownloaderDescriptor = components['schemas']['DownloaderDescriptor'];
export type DownloaderMatch = components['schemas']['DownloaderMatch'];
export type DownloaderMatchRequest = components['schemas']['DownloaderMatchRequest'];
export type DownloaderPathOverride = components['schemas']['DownloaderPathOverride'];
export type DownloaderPreflightRequest = components['schemas']['DownloaderPreflightRequest'];
export type DownloaderPreflightResponse = components['schemas']['DownloaderPreflightResponse'];
export type DownloaderQualityOption = components['schemas']['DownloaderQualityOption'];
export type DownloaderStartRequest = components['schemas']['DownloaderStartRequest'];
export type DynamicGroupSource = components['schemas']['DynamicGroupSource'];
export type Embedding = components['schemas']['Embedding'];
export type EmbeddingHostType = components['schemas']['EmbeddingHostType'];
export type EmbeddingModality = components['schemas']['EmbeddingModality'];
export type EmbeddingSearchRequest = components['schemas']['EmbeddingSearchRequest'];
export type EmbeddingSearchResult = components['schemas']['EmbeddingSearchResult'];
export type EngagementInteraction = components['schemas']['EngagementInteraction'];
export type EngagementInteractionWrite = components['schemas']['EngagementInteractionWrite'];
export type EntityEngagement = components['schemas']['EntityEngagement'];
export type EntityEngagementBatchRequest = components['schemas']['EntityEngagementBatchRequest'];
export type EntityFavorite = components['schemas']['EntityFavorite'];
export type EntityImageCoverSource = components['schemas']['EntityImageCoverSource'];
export type EntityRatings = components['schemas']['EntityRatings'];
export type ExportOptions = components['schemas']['ExportOptions'];
export type ExtensionAction = components['schemas']['ExtensionAction'];
export type ExtensionDependencyImpact = components['schemas']['ExtensionDependencyImpact'];
export type ExtensionExternalDependency = components['schemas']['ExtensionExternalDependency'];
export type ExtensionInfo = components['schemas']['ExtensionInfo'];
export type ExtensionJobInfo = components['schemas']['ExtensionJobInfo'];
export type ExtensionSettingManifest = components['schemas']['ExtensionSettingManifest'];
export type Face = components['schemas']['Face'];
export type FaceAppearance = components['schemas']['FaceAppearance'];
export type FaceBatchDelete = components['schemas']['FaceBatchDelete'];
export type FaceBatchFailed = components['schemas']['FaceBatchFailed'];
export type FaceBatchLinkTopSuggestion = components['schemas']['FaceBatchLinkTopSuggestion'];
export type FaceBatchOperationResult = components['schemas']['FaceBatchOperationResult'];
export type FaceBatchSkipped = components['schemas']['FaceBatchSkipped'];
export type FaceCreate = components['schemas']['FaceCreate'];
export type FaceCreatePerformer = components['schemas']['FaceCreatePerformer'];
export type FaceDeleteImpact = components['schemas']['FaceDeleteImpact'];
export type FaceHostFace = components['schemas']['FaceHostFace'];
export type FaceIgnore = components['schemas']['FaceIgnore'];
export type FaceLink = components['schemas']['FaceLink'];
export type FaceMerge = components['schemas']['FaceMerge'];
export type FaceSimilar = components['schemas']['FaceSimilar'];
export type FaceSuggestion = components['schemas']['FaceSuggestion'];
export type FaceSuggestionDecision = components['schemas']['FaceSuggestionDecision'];
export type FaceSuggestionEvidence = components['schemas']['FaceSuggestionEvidence'];
export type FaceTopSuggestion = components['schemas']['FaceTopSuggestion'];
export type FaceUpdate = components['schemas']['FaceUpdate'];
export type FfmpegCapabilities = components['schemas']['FfmpegCapabilities'];
export type FieldProvenance = components['schemas']['FieldProvenance'];
export type FileBackedCreate = components['schemas']['FileBackedCreate'];
export type FileSetFingerprints = components['schemas']['FileSetFingerprints'];
export type FilteredQueryRequestOfAudioFilter = components['schemas']['FilteredQueryRequestOfAudioFilter'];
export type FilteredQueryRequestOfGalleryFilter = components['schemas']['FilteredQueryRequestOfGalleryFilter'];
export type FilteredQueryRequestOfGroupFilter = components['schemas']['FilteredQueryRequestOfGroupFilter'];
export type FilteredQueryRequestOfImageFilter = components['schemas']['FilteredQueryRequestOfImageFilter'];
export type FilteredQueryRequestOfPerformerFilter = components['schemas']['FilteredQueryRequestOfPerformerFilter'];
export type FilteredQueryRequestOfStudioFilter = components['schemas']['FilteredQueryRequestOfStudioFilter'];
export type FilteredQueryRequestOfTagFilter = components['schemas']['FilteredQueryRequestOfTagFilter'];
export type FilteredQueryRequestOfTextDocumentFilter = components['schemas']['FilteredQueryRequestOfTextDocumentFilter'];
export type FilteredQueryRequestOfVideoFilter = components['schemas']['FilteredQueryRequestOfVideoFilter'];
export type FindFilter = components['schemas']['FindFilter'];
export type Fingerprint = components['schemas']['Fingerprint'];
export type FingerprintCriterion = components['schemas']['FingerprintCriterion'];
export type FingerprintEntry = components['schemas']['FingerprintEntry'];
export type Gallery = components['schemas']['Gallery'];
export type GalleryAddImages = components['schemas']['GalleryAddImages'];
export type GalleryChapter = components['schemas']['GalleryChapter'];
export type GalleryChapterCreate = components['schemas']['GalleryChapterCreate'];
export type GalleryChapterUpdate = components['schemas']['GalleryChapterUpdate'];
export type GalleryCreate = components['schemas']['GalleryCreate'];
export type GalleryFileInfo = components['schemas']['GalleryFileInfo'];
export type GalleryFilter = components['schemas']['GalleryFilter'];
export type GalleryRemoveImages = components['schemas']['GalleryRemoveImages'];
export type GallerySetCover = components['schemas']['GallerySetCover'];
export type GallerySummary = components['schemas']['GallerySummary'];
export type GalleryUpdate = components['schemas']['GalleryUpdate'];
export type GenerateOptions = components['schemas']['GenerateOptions'];
export type GenerateScreenshot = components['schemas']['GenerateScreenshot'];
export type Group = components['schemas']['Group'];
export type GroupCreate = components['schemas']['GroupCreate'];
export type GroupFilter = components['schemas']['GroupFilter'];
export type GroupItem = components['schemas']['GroupItem'];
export type GroupItemCreate = components['schemas']['GroupItemCreate'];
export type GroupItemKind = components['schemas']['GroupItemKind'];
export type GroupItemsFromSpans = components['schemas']['GroupItemsFromSpans'];
export type GroupItemSpanInput = components['schemas']['GroupItemSpanInput'];
export type GroupItemsRemoveHosts = components['schemas']['GroupItemsRemoveHosts'];
export type GroupItemsReorder = components['schemas']['GroupItemsReorder'];
export type GroupItemUpdate = components['schemas']['GroupItemUpdate'];
export type GroupKind = components['schemas']['GroupKind'];
export type GroupPlaybackManifest = components['schemas']['GroupPlaybackManifest'];
export type GroupPlaybackManifestItem = components['schemas']['GroupPlaybackManifestItem'];
export type GroupQueryUpdate = components['schemas']['GroupQueryUpdate'];
export type GroupSummary = components['schemas']['GroupSummary'];
export type GroupUpdate = components['schemas']['GroupUpdate'];
export type IdentifyDefaultsConfig = components['schemas']['IdentifyDefaultsConfig'];
export type IdentifyOptions = components['schemas']['IdentifyOptions'];
export type IFormFile = components['schemas']['IFormFile'];
export type Image = components['schemas']['Image'];
export type ImageCreate = components['schemas']['ImageCreate'];
export type ImageFile = components['schemas']['ImageFile'];
export type ImageFilter = components['schemas']['ImageFilter'];
export type ImageUpdate = components['schemas']['ImageUpdate'];
export type ImportOptions = components['schemas']['ImportOptions'];
export type ImportRequest = components['schemas']['ImportRequest'];
export type InstallExtensionFromUrlRequest = components['schemas']['InstallExtensionFromUrlRequest'];
export type IntCriterion = components['schemas']['IntCriterion'];
export type InteractionEvent = components['schemas']['InteractionEvent'];
export type InterfaceConfig = components['schemas']['InterfaceConfig'];
export type InviteRedeemRequest = components['schemas']['InviteRedeemRequest'];
export type JobInfo = components['schemas']['JobInfo'];
export type JobStatus = components['schemas']['JobStatus'];
export type JsonElement = components['schemas']['JsonElement'];
export type LibraryFolder = components['schemas']['LibraryFolder'];
export type LogEntry = components['schemas']['LogEntry'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type MeResponse = components['schemas']['MeResponse'];
export type MetadataBatchDefaultsConfig = components['schemas']['MetadataBatchDefaultsConfig'];
export type MetadataServer = components['schemas']['MetadataServer'];
export type MetadataServerEndpoint = components['schemas']['MetadataServerEndpoint'];
export type MetadataServerEntityCandidate = components['schemas']['MetadataServerEntityCandidate'];
export type MetadataServerFindByIdsRequest = components['schemas']['MetadataServerFindByIdsRequest'];
export type MetadataServerFingerprint = components['schemas']['MetadataServerFingerprint'];
export type MetadataServerPerformerBatchTagRequest = components['schemas']['MetadataServerPerformerBatchTagRequest'];
export type MetadataServerPerformerImportRequest = components['schemas']['MetadataServerPerformerImportRequest'];
export type MetadataServerPerformerMatch = components['schemas']['MetadataServerPerformerMatch'];
export type MetadataServerStudioBatchTagRequest = components['schemas']['MetadataServerStudioBatchTagRequest'];
export type MetadataServerStudioImportRequest = components['schemas']['MetadataServerStudioImportRequest'];
export type MetadataServerStudioMatch = components['schemas']['MetadataServerStudioMatch'];
export type MetadataServerTagBatchTagRequest = components['schemas']['MetadataServerTagBatchTagRequest'];
export type MetadataServerTagImportRequest = components['schemas']['MetadataServerTagImportRequest'];
export type MetadataServerTagMatch = components['schemas']['MetadataServerTagMatch'];
export type MetadataServerValidationResult = components['schemas']['MetadataServerValidationResult'];
export type MetadataServerVideoEntityOverride = components['schemas']['MetadataServerVideoEntityOverride'];
export type MetadataServerVideoImportRequest = components['schemas']['MetadataServerVideoImportRequest'];
export type MetadataServerVideoMatch = components['schemas']['MetadataServerVideoMatch'];
export type MeUser = components['schemas']['MeUser'];
export type MoveFiles = components['schemas']['MoveFiles'];
export type MultiIdCriterion = components['schemas']['MultiIdCriterion'];
export type PaginatedResponseOfAiRun = components['schemas']['PaginatedResponseOfAiRun'];
export type PaginatedResponseOfAudio = components['schemas']['PaginatedResponseOfAudio'];
export type PaginatedResponseOfEmbedding = components['schemas']['PaginatedResponseOfEmbedding'];
export type PaginatedResponseOfFace = components['schemas']['PaginatedResponseOfFace'];
export type PaginatedResponseOfFaceAppearance = components['schemas']['PaginatedResponseOfFaceAppearance'];
export type PaginatedResponseOfFaceSimilar = components['schemas']['PaginatedResponseOfFaceSimilar'];
export type PaginatedResponseOfGallery = components['schemas']['PaginatedResponseOfGallery'];
export type PaginatedResponseOfGroup = components['schemas']['PaginatedResponseOfGroup'];
export type PaginatedResponseOfGroupItem = components['schemas']['PaginatedResponseOfGroupItem'];
export type PaginatedResponseOfImage = components['schemas']['PaginatedResponseOfImage'];
export type PaginatedResponseOfPerformer = components['schemas']['PaginatedResponseOfPerformer'];
export type PaginatedResponseOfSegmentRecord = components['schemas']['PaginatedResponseOfSegmentRecord'];
export type PaginatedResponseOfStudio = components['schemas']['PaginatedResponseOfStudio'];
export type PaginatedResponseOfTagList = components['schemas']['PaginatedResponseOfTagList'];
export type PaginatedResponseOfTextDocument = components['schemas']['PaginatedResponseOfTextDocument'];
export type PaginatedResponseOfVideo = components['schemas']['PaginatedResponseOfVideo'];
export type PaginatedResponseOfVideoListEntry = components['schemas']['PaginatedResponseOfVideoListEntry'];
export type PathMappingRequest = components['schemas']['PathMappingRequest'];
export type Performer = components['schemas']['Performer'];
export type PerformerApplyScrapedRequest = components['schemas']['PerformerApplyScrapedRequest'];
export type PerformerCreate = components['schemas']['PerformerCreate'];
export type PerformerFilter = components['schemas']['PerformerFilter'];
export type PerformerMerge = components['schemas']['PerformerMerge'];
export type PerformerRemoteId = components['schemas']['PerformerRemoteId'];
export type PerformerScrapePreview = components['schemas']['PerformerScrapePreview'];
export type PerformerScrapeRequest = components['schemas']['PerformerScrapeRequest'];
export type PerformerScrapeUrlRequest = components['schemas']['PerformerScrapeUrlRequest'];
export type PerformerSummary = components['schemas']['PerformerSummary'];
export type PerformerUpdate = components['schemas']['PerformerUpdate'];
export type PlaybackInterval = components['schemas']['PlaybackInterval'];
export type PlaybackIntervalInput = components['schemas']['PlaybackIntervalInput'];
export type PlaybackIntervalsRequest = components['schemas']['PlaybackIntervalsRequest'];
export type Plugin = components['schemas']['Plugin'];
export type PluginSettings = components['schemas']['PluginSettings'];
export type PluginSettingSchema = components['schemas']['PluginSettingSchema'];
export type PluginTask = components['schemas']['PluginTask'];
export type PreviewRequest = components['schemas']['PreviewRequest'];
export type RatingStarPrecision = components['schemas']['RatingStarPrecision'];
export type RatingSystemOptions = components['schemas']['RatingSystemOptions'];
export type RatingSystemType = components['schemas']['RatingSystemType'];
export type RecomputeDerivedCountsResult = components['schemas']['RecomputeDerivedCountsResult'];
export type RefreshRequest = components['schemas']['RefreshRequest'];
export type RegistryExtensionDetail = components['schemas']['RegistryExtensionDetail'];
export type RegistryExtensionSummary = components['schemas']['RegistryExtensionSummary'];
export type RegistryInstallExtensionRef = components['schemas']['RegistryInstallExtensionRef'];
export type RegistryInstallRequest = components['schemas']['RegistryInstallRequest'];
export type RegistryInstallResult = components['schemas']['RegistryInstallResult'];
export type RegistrySearchResult = components['schemas']['RegistrySearchResult'];
export type RegistryUninstallRequest = components['schemas']['RegistryUninstallRequest'];
export type RegistryUninstallResult = components['schemas']['RegistryUninstallResult'];
export type RegistryUpdateInfo = components['schemas']['RegistryUpdateInfo'];
export type RegistryVersionInfo = components['schemas']['RegistryVersionInfo'];
export type ReorderJobRequest = components['schemas']['ReorderJobRequest'];
export type ReorderSubGroups = components['schemas']['ReorderSubGroups'];
export type ResolvedSpan = components['schemas']['ResolvedSpan'];
export type ResolvedSpanDetail = components['schemas']['ResolvedSpanDetail'];
export type ResolvedSpanInterval = components['schemas']['ResolvedSpanInterval'];
export type ResolvedSpanList = components['schemas']['ResolvedSpanList'];
export type ResolveScrapeRelationsRequest = components['schemas']['ResolveScrapeRelationsRequest'];
export type ResolveScrapeRelationsResult = components['schemas']['ResolveScrapeRelationsResult'];
export type RestoreBackupRequest = components['schemas']['RestoreBackupRequest'];
export type RestoreBackupResult = components['schemas']['RestoreBackupResult'];
export type RunPluginTask = components['schemas']['RunPluginTask'];
export type SavedFilter = components['schemas']['SavedFilter'];
export type SavedFilterCreate = components['schemas']['SavedFilterCreate'];
export type SavedFilterUpdate = components['schemas']['SavedFilterUpdate'];
export type ScanOptions = components['schemas']['ScanOptions'];
export type ScrapeApplyDefaultsConfig = components['schemas']['ScrapeApplyDefaultsConfig'];
export type ScrapeAttempt = components['schemas']['ScrapeAttempt'];
export type ScrapeCollectionItemSelection = components['schemas']['ScrapeCollectionItemSelection'];
export type ScrapedPerformer = components['schemas']['ScrapedPerformer'];
export type ScrapeFragmentRequest = components['schemas']['ScrapeFragmentRequest'];
export type ScrapeNameRequest = components['schemas']['ScrapeNameRequest'];
export type ScrapeRelationMatch = components['schemas']['ScrapeRelationMatch'];
export type ScraperMatchUrlRequest = components['schemas']['ScraperMatchUrlRequest'];
export type ScraperPreference = components['schemas']['ScraperPreference'];
export type ScraperSummary = components['schemas']['ScraperSummary'];
export type ScrapeUrlRequest = components['schemas']['ScrapeUrlRequest'];
export type ScrapingConfig = components['schemas']['ScrapingConfig'];
export type SecurityConfig = components['schemas']['SecurityConfig'];
export type Segment = components['schemas']['Segment'];
export type SegmentCreate = components['schemas']['SegmentCreate'];
export type SegmentDisplayProfile = components['schemas']['SegmentDisplayProfile'];
export type SegmentDisplayProfileCreate = components['schemas']['SegmentDisplayProfileCreate'];
export type SegmentDisplayProfilePreviewRequest = components['schemas']['SegmentDisplayProfilePreviewRequest'];
export type SegmentDisplayProfileUpdate = components['schemas']['SegmentDisplayProfileUpdate'];
export type SegmentDisplayRule = components['schemas']['SegmentDisplayRule'];
export type SegmentDisplayRuleCreate = components['schemas']['SegmentDisplayRuleCreate'];
export type SegmentDisplayRuleUpdate = components['schemas']['SegmentDisplayRuleUpdate'];
export type SegmentDistinctValue = components['schemas']['SegmentDistinctValue'];
export type SegmentHostType = components['schemas']['SegmentHostType'];
export type SegmentRecord = components['schemas']['SegmentRecord'];
export type SegmentSpanCountResponse = components['schemas']['SegmentSpanCountResponse'];
export type SegmentSpanDerivedQuery = components['schemas']['SegmentSpanDerivedQuery'];
export type SegmentSpanOperand = components['schemas']['SegmentSpanOperand'];
export type SegmentSpanQueryRequest = components['schemas']['SegmentSpanQueryRequest'];
export type SegmentSpanSearchRequest = components['schemas']['SegmentSpanSearchRequest'];
export type SegmentSpanSearchResponse = components['schemas']['SegmentSpanSearchResponse'];
export type SegmentSpanSearchResultItem = components['schemas']['SegmentSpanSearchResultItem'];
export type SegmentTagBulkRemoveRequest = components['schemas']['SegmentTagBulkRemoveRequest'];
export type SegmentUpdate = components['schemas']['SegmentUpdate'];
export type SetLogLevelRequest = components['schemas']['SetLogLevelRequest'];
export type SetRolesRequest = components['schemas']['SetRolesRequest'];
export type SettingsTabLayout = components['schemas']['SettingsTabLayout'];
export type SetupTokenRedeemRequest = components['schemas']['SetupTokenRedeemRequest'];
export type SortDirection = components['schemas']['SortDirection'];
export type StashImportResult = components['schemas']['StashImportResult'];
export type StashPreviewResult = components['schemas']['StashPreviewResult'];
export type Stats = components['schemas']['Stats'];
export type StringCriterion = components['schemas']['StringCriterion'];
export type Studio = components['schemas']['Studio'];
export type StudioCreate = components['schemas']['StudioCreate'];
export type StudioFilter = components['schemas']['StudioFilter'];
export type StudioMerge = components['schemas']['StudioMerge'];
export type StudioRemoteId = components['schemas']['StudioRemoteId'];
export type StudioUpdate = components['schemas']['StudioUpdate'];
export type SyncFingerprintsOptions = components['schemas']['SyncFingerprintsOptions'];
export type SystemStatus = components['schemas']['SystemStatus'];
export type Tag = components['schemas']['Tag'];
export type TagApplication = components['schemas']['TagApplication'];
export type TagApplicationCreate = components['schemas']['TagApplicationCreate'];
export type TagCreate = components['schemas']['TagCreate'];
export type TagDetail = components['schemas']['TagDetail'];
export type TagDurationClause = components['schemas']['TagDurationClause'];
export type TagDurationCriterion = components['schemas']['TagDurationCriterion'];
export type TagFilter = components['schemas']['TagFilter'];
export type TagGraphLink = components['schemas']['TagGraphLink'];
export type TagGraphNode = components['schemas']['TagGraphNode'];
export type TagGraphResponse = components['schemas']['TagGraphResponse'];
export type TagGroup = components['schemas']['TagGroup'];
export type TagGroupCreate = components['schemas']['TagGroupCreate'];
export type TagGroupUpdate = components['schemas']['TagGroupUpdate'];
export type TagList = components['schemas']['TagList'];
export type TagMerge = components['schemas']['TagMerge'];
export type TagProvenance = components['schemas']['TagProvenance'];
export type TagRemoteId = components['schemas']['TagRemoteId'];
export type TagSegmentWall = components['schemas']['TagSegmentWall'];
export type TagUpdate = components['schemas']['TagUpdate'];
export type TextContent = components['schemas']['TextContent'];
export type TextDocument = components['schemas']['TextDocument'];
export type TextDocumentCreate = components['schemas']['TextDocumentCreate'];
export type TextDocumentFilter = components['schemas']['TextDocumentFilter'];
export type TextDocumentUpdate = components['schemas']['TextDocumentUpdate'];
export type TextFile = components['schemas']['TextFile'];
export type TimestampCriterion = components['schemas']['TimestampCriterion'];
export type UiComponentOverride = components['schemas']['UIComponentOverride'];
export type UiComponentStyleDef = components['schemas']['UIComponentStyleDef'];
export type UiConfig = components['schemas']['UiConfig'];
export type UiDialogOverride = components['schemas']['UIDialogOverride'];
export type UiFeatureDefinition = components['schemas']['UIFeatureDefinition'];
export type UiLayoutStyleDef = components['schemas']['UILayoutStyleDef'];
export type UiListFilterContribution = components['schemas']['UIListFilterContribution'];
export type UiListFilterOption = components['schemas']['UIListFilterOption'];
export type UiListSortContribution = components['schemas']['UIListSortContribution'];
export type UiManifest = components['schemas']['UIManifest'];
export type UiPageDefinition = components['schemas']['UIPageDefinition'];
export type UiPageOverride = components['schemas']['UIPageOverride'];
export type UiPaneContribution = components['schemas']['UIPaneContribution'];
export type UiSelectorOverride = components['schemas']['UISelectorOverride'];
export type UiSettingsPanel = components['schemas']['UISettingsPanel'];
export type UiSettingsTab = components['schemas']['UISettingsTab'];
export type UiSlotContribution = components['schemas']['UISlotContribution'];
export type UiTabContribution = components['schemas']['UITabContribution'];
export type UiThemeDefinition = components['schemas']['UIThemeDefinition'];
export type UiTutorialLink = components['schemas']['UITutorialLink'];
export type UiTutorialSlide = components['schemas']['UITutorialSlide'];
export type UiTutorialTopic = components['schemas']['UITutorialTopic'];
export type UpdateContentRuleRequest = components['schemas']['UpdateContentRuleRequest'];
export type UpdateRoleRequest = components['schemas']['UpdateRoleRequest'];
export type UpdateUserRequest = components['schemas']['UpdateUserRequest'];
export type UserPlaybackPreferences = components['schemas']['UserPlaybackPreferences'];
export type UserRatingSystemOptions = components['schemas']['UserRatingSystemOptions'];
export type UserThemePreferences = components['schemas']['UserThemePreferences'];
export type UserTrackingPreferences = components['schemas']['UserTrackingPreferences'];
export type UserUiPreferences = components['schemas']['UserUiPreferences'];
export type UserVideosPreferences = components['schemas']['UserVideosPreferences'];
export type Video = components['schemas']['Video'];
export type VideoAssignFile = components['schemas']['VideoAssignFile'];
export type VideoCreate = components['schemas']['VideoCreate'];
export type VideoFile = components['schemas']['VideoFile'];
export type VideoFilter = components['schemas']['VideoFilter'];
export type VideoGroupInput = components['schemas']['VideoGroupInput'];
export type VideoHistory = components['schemas']['VideoHistory'];
export type VideoListEntry = components['schemas']['VideoListEntry'];
export type VideoMerge = components['schemas']['VideoMerge'];
export type VideoPlaybackSession = components['schemas']['VideoPlaybackSession'];
export type VideoRating = components['schemas']['VideoRating'];
export type VideoRemoteId = components['schemas']['VideoRemoteId'];
export type VideoResolvedSpans = components['schemas']['VideoResolvedSpans'];
export type VideoUpdate = components['schemas']['VideoUpdate'];
export type WipeResult = components['schemas']['WipeResult'];
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
