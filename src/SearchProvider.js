/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
function joinPath(resource, pathFragment) {
    const joinedPath = path.join(resource.path || '/', pathFragment);
    return resource.with({
        path: joinedPath
    });
}
function escapeRegExpCharacters(value) {
    return value.replace(/[\-\\\{\}\*\+\?\|\^\$\.\[\]\(\)\#]/g, '\\$&');
}
class SearchMemFS {
    constructor(memfs) {
        this.memfs = memfs;
    }
    provideTextSearchResults(query, options, progress, token) {
        const flags = query.isCaseSensitive ? 'g' : 'ig';
        let regexText = query.isRegExp ? query.pattern : escapeRegExpCharacters(query.pattern);
        if (query.isWordMatch) {
            regexText = `\\b${regexText}\\b`;
        }
        const searchRegex = new RegExp(regexText, flags);
        this._textSearchDir(options.folder, '', searchRegex, options, progress);
        return Promise.resolve();
    }
    _textSearchDir(baseFolder, relativeDir, pattern, options, progress) {
        this.memfs.readDirectory(joinPath(baseFolder, relativeDir))
            .forEach(([name, type]) => {
            const relativeResult = path.join(relativeDir, name);
            if (type === vscode.FileType.Directory) {
                this._textSearchDir(baseFolder, relativeResult, pattern, options, progress);
            }
            else if (type === vscode.FileType.File) {
                this._textSearchFile(baseFolder, relativeResult, pattern, options, progress);
            }
        });
    }
    _textSearchFile(baseFolder, relativePath, pattern, options, progress) {
        const fileUri = joinPath(baseFolder, relativePath);
        const fileContents = new Buffer(this.memfs.readFile(fileUri))
            .toString(options.encoding || 'utf8');
        fileContents
            .split(/\r?\n/)
            .forEach((line, i) => {
            let result;
            while (result = pattern.exec(line)) {
                const range = new vscode.Range(i, result.index, i, result.index + result[0].length);
                progress.report({
                    path: relativePath,
                    range,
                    // options.previewOptions will describe parameters for this
                    preview: {
                        text: line,
                        match: new vscode.Range(0, range.start.character, 0, range.end.character)
                    }
                });
            }
        });
    }
    provideFileSearchResults(options, progress, token) {
        this._fileSearchDir(options.folder, '', progress);
        return Promise.resolve();
    }
    _fileSearchDir(folder, relativePath, progress) {
        this.memfs.readDirectory(joinPath(folder, relativePath))
            .forEach(([name, type]) => {
            const relativeResult = path.join(relativePath, name);
            if (type === vscode.FileType.Directory) {
                this._fileSearchDir(folder, relativeResult, progress);
            }
            else if (type === vscode.FileType.File) {
                progress.report(relativeResult);
            }
        });
    }
}
exports.SearchMemFS = SearchMemFS;
//# sourceMappingURL=SearchProvider.js.map