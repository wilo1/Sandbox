

    
/// <reference path="./rmx/model.ts" />
/// <reference path="./rmx/model-loader.ts" />
/// <reference path="./rmx/model-animation.ts" />
/// <reference path="./rmx/threejs-loader.ts" />
/// <reference path="../external/threejs/three.d.ts" />
/// <reference path="../external/stats/stats.d.ts" />

/// <reference path="../lib/collada.d.ts" />
/// <reference path="../external/jquery/jquery.d.ts" />
    var ColladaConverterOption = (function () {
        function ColladaConverterOption(option, parent) {
            var _this = this;
            this.option = option;
            // Label
            var label = $("<label>").addClass("col-sm-6").addClass("control-label").text(option.title);
            // Control
            var control_content = null;
            switch (option.type) {
                case "boolean":
                    this.control = $("<input>").attr("type", "checkbox");
                    control_content = $("<div>").addClass("checkbox").append($("<label>").append(this.control).append("Enabled"));
                    this.getFn = function () { return _this.control.prop("checked"); };
                    this.setFn = function (value) { return _this.control.prop("checked", value); };
                    break;
                case "number":
                    this.control = $("<input>").attr("type", "number").addClass("form-control");
                    control_content = this.control;
                    this.getFn = function () { return _this.control.val(); };
                    this.setFn = function (value) { return _this.control.val(value); };
                    break;
                case "select":
                    var src_option = option;
                    this.control = $("<select>").addClass("form-control");
                    control_content = this.control;
                    src_option.options.forEach(function (value) {
                        _this.control.append($("<option>").attr("value", value).text(value));
                    });
                    this.getFn = function () { return _this.control.val(); };
                    this.setFn = function (value) { return _this.control.val(value); };
                    break;
                default:
                    throw new Error("Unknown option type");
            }
            var control_group = $("<div>").addClass("col-sm-4");
            control_group.append(control_content);
            // Initialize
            this.setFn(option.value);
            // Events
            this.control.change(function () {
                _this.option.value = _this.getFn();
            });
            // Info
            var info_icon = $("<span>").addClass("glyphicon glyphicon-info-sign");
            var info_button = $("<button>").addClass("btn btn-info btn-block").attr("type", "button");
            info_button.popover({ 'title': option.title, 'html': true, 'content': option.description, 'placement': top, 'trigger': 'click hover' });
            info_button.append(info_icon);
            var info_group = $("<div>").addClass("col-sm-2");
            info_group.append(info_button);
            // Group
            this.group = $("<div>").addClass("form-group");
            this.group.append(label);
            this.group.append(control_group);
            this.group.append(info_group);
            if (parent) {
                parent.append(this.group);
            }
        }
        return ColladaConverterOption;
    })();
    var parseAnimations;
    (function (parseAnimations) {
        var AnimationLabel = (function () {
            function AnimationLabel() {
                this.name = null;
                this.begin = null;
                this.begin = null;
                this.fps = null;
            }
            return AnimationLabel;
        })();
        parseAnimations.AnimationLabel = AnimationLabel;
        function isNumber(str) {
            return !isNaN(parseInt(str, 10));
        }
        function isString(str) {
            return !isNumber(str);
        }
        /** Count number of elements for which the callback returns true */
        function count(data, callback) {
            var result = 0;
            data.forEach(function (t) {
                if (callback(t)) {
                    result++;
                }
            });
            return result;
        }
        /** Returns true if all elements of data have the same content at the given index */
        function sameContent(data, indexFn) {
            if (data.length < 2) {
                return false;
            }
            var contents = data.map(function (line) {
                var index = indexFn(line);
                if (index < 0 || line.length <= index) {
                    return null;
                }
                else {
                    return line[index];
                }
            });
            return contents.every(function (content) {
                return content !== null && content === contents[0];
            });
        }
        function guessLabel(line) {
            var numbers = line.filter(isNumber).map(function (str) { return parseInt(str, 10); });
            var strings = line.filter(isString);
            if (numbers.length < 2 || strings.length < 1) {
                return null;
            }
            var result = new AnimationLabel;
            result.name = strings.join(" ");
            result.begin = numbers.reduce(function (prev, cur) { return Math.min(prev, cur); }, Infinity);
            result.end = numbers.reduce(function (prev, cur) { return Math.max(prev, cur); }, -Infinity);
            return result;
        }
        function parse(source) {
            var lines = source.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
            // Remove trailing whitespace
            lines = lines.map(function (line) { return line.trim(); });
            // Split lines
            var parts = lines.map(function (line) { return line.split(/[\s-:;,]+/); });
            // Remove invalid lines
            var parts = parts.filter(function (line) {
                if (line.length < 3)
                    return false;
                if (count(line, isNumber) < 2)
                    return false;
                if (count(line, isString) < 1)
                    return false;
                return true;
            });
            // Longest line
            var maxLength = parts.reduce(function (prev, cur) { return Math.max(prev, cur.length); }, 0);
            // Remove parts that are the same on each line (from the beginning of each line)
            var i = 0;
            while (i < maxLength) {
                if (sameContent(parts, function () { return i; })) {
                    parts = parts.map(function (line) { return line.filter(function (value, index) { return index !== i; }); });
                    maxLength--;
                }
                else {
                    i++;
                }
            }
            // Remove parts that are the same on each line (from the end of each line)
            i = 0;
            while (i < maxLength) {
                if (sameContent(parts, function (str) { return str.length - i - 1; })) {
                    parts = parts.filter(function (value, index) { return index !== i; });
                    maxLength--;
                }
                else {
                    i++;
                }
            }
            // Extract labels from each line
            var labels = parts.map(function (line) { return guessLabel(line); });
            return labels.filter(function (label) { return label !== null; });
        }
        parseAnimations.parse = parse;
    })(parseAnimations || (parseAnimations = {}));
// Code from https://github.com/lydell/json-stringify-pretty-compact
// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)
    var stringify;
    (function (_stringify) {
        function stringify(obj, options) {
            options = options || {};
            var indent = JSON.stringify([1], null, get(options, "indent", 2)).slice(2, -3);
            var maxLength = (indent === "" ? Infinity : get(options, "maxLength", 80));
            return (function _stringify(obj, currentIndent, reserved) {
                if (obj && typeof obj.toJSON === "function") {
                    obj = obj.toJSON();
                }
                var string = JSON.stringify(obj);
                if (string === undefined) {
                    return string;
                }
                var length = maxLength - currentIndent.length - reserved;
                if (string.length <= length) {
                    var prettified = prettify(string);
                    if (prettified.length <= length) {
                        return prettified;
                    }
                }
                if (typeof obj === "object" && obj !== null) {
                    var nextIndent = currentIndent + indent;
                    var items = [];
                    var delimiters;
                    var comma = function (array, index) {
                        return (index === array.length - 1 ? 0 : 1);
                    };
                    if (Array.isArray(obj)) {
                        for (var index = 0; index < obj.length; index++) {
                            items.push(_stringify(obj[index], nextIndent, comma(obj, index)) || "null");
                        }
                        delimiters = "[]";
                    }
                    else {
                        Object.keys(obj).forEach(function (key, index, array) {
                            var keyPart = JSON.stringify(key) + ": ";
                            var value = _stringify(obj[key], nextIndent, keyPart.length + comma(array, index));
                            if (value !== undefined) {
                                items.push(keyPart + value);
                            }
                        });
                        delimiters = "{}";
                    }
                    if (items.length > 0) {
                        return [
                            delimiters[0],
                            indent + items.join(",\n" + nextIndent),
                            delimiters[1]
                        ].join("\n" + currentIndent);
                    }
                }
                return string;
            }(obj, "", 0));
        }
        _stringify.stringify = stringify;
        // Note: This regex matches even invalid JSON strings, but since we’re
        // working on the output of `JSON.stringify` we know that only valid strings
        // are present (unless the user supplied a weird `options.indent` but in
        // that case we don’t care since the output would be invalid anyway).
        var stringOrChar = /("(?:[^"]|\\.)*")|[:,]/g;
        function prettify(string) {
            return string.replace(stringOrChar, function (match, string) {
                if (string) {
                    return match;
                }
                return match + " ";
            });
        }
        function get(options, name, defaultValue) {
            return (name in options ? options[name] : defaultValue);
        }
    })(stringify || (stringify = {}));

requirejs.config({
    //Remember: only use shim config for non-AMD scripts,
    //scripts that do not already call define(). The shim
    //config will not work correctly if used on AMD scripts,
    //in particular, the exports and init config will not
    //be triggered, and the deps config will be confusing
    //for those cases.
    shim: {
        "vwf/view/editorview/RMXConverter":{
            deps:["vwf/view/editorview/RMXUtils","vwf/view/editorview/gl-matrix.js"]
        },
        "vwf/view/editorview/RMXUtils":{
            deps:["vwf/view/editorview/gl-matrix.js"]
        }
    }
})

define(["vwf/view/editorview/RMXConverter"], function() {
    var AssetUpload = {};
    var isInitialized = false;
    return {
        getSingleton: function() {
            if (!isInitialized) {
                initialize.call(AssetUpload);
                isInitialized = true;
            }
            return AssetUpload;
        }
    };




    function createKendoWindow(id, title, kendoProperties, callback) {
        if (!kendoProperties)
            kendoProperties = {};

        $(document.body).append("<div id='" + id + "' />");

        var alertWindow = $("#" + id);

        if (!alertWindow.data("kendoWindow")) {
            alertWindow.kendoWindow({
                title: title,
                actions: kendoProperties.actions || [
                    "Pin",
                    "Minimize",
                    "Maximize",
                    "Close"
                ],
                visible: false,
                //maxHeight: kendoProperties.maxHeight || 450,
                width: kendoProperties.width || 760,
                maxWidth: kendoProperties.maxWidth || 760,
                height: kendoProperties.height || 450
            });

            alertWindow = alertWindow.data("kendoWindow");
            alertWindow.center();
        }
        if (callback)
            return callback(alertWindow);
        return;
    }



/// <reference path="../lib/collada.d.ts" />
/// <reference path="../external/jquery/jquery.d.ts" />
/// <reference path="./threejs-renderer.ts" />
/// <reference path="./convert-options.ts" />
/// <reference path="./parse-animations.ts" />
/// <reference path="./stringify.ts" />
// ----------------------------------------------------------------------------
// Evil global data
// ----------------------------------------------------------------------------
    var timestamps = {};
    var options = new COLLADA.Converter.Options();
    var optionElements = [];
    var renderer;
    _AssetUpload.conversion_data = {
        stage: null,
        exception: null,
        s0_source: null,
        s0_animations: null,
        s1_xml: null,
        s2_loaded: null,
        s3_converted: null,
        s4_exported_custom: null,
        s5_exported_threejs: null
    };
// ----------------------------------------------------------------------------
// Misc
// ----------------------------------------------------------------------------
    function fileSizeStr(bytes) {
        var kilo = 1024;
        var mega = 1024 * 1024;
        var giga = 1024 * 1024 * 1024;
        var tera = 1024 * 1024 * 1024 * 1024;
        var value = 0;
        var unit = "";
        if (bytes < kilo) {
            value = bytes;
            unit = "B";
        }
        else if (bytes < mega) {
            value = bytes / kilo;
            unit = "kB";
        }
        else if (bytes < giga) {
            value = bytes / mega;
            unit = "MB";
        }
        else if (bytes < tera) {
            value = bytes / giga;
            unit = "GB";
        }
        else {
            return ">1TB";
        }
        if (value < 10) {
            return value.toFixed(3) + " " + unit;
        }
        else if (value < 100) {
            return value.toFixed(2) + " " + unit;
        }
        else {
            return value.toFixed(1) + " " + unit;
        }
    }
// ----------------------------------------------------------------------------
// Log
// ----------------------------------------------------------------------------
    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function writeProgress(msg) {
        $("#log").append(msg + "\n");
    }
    function writeLog(name, message, level) {
        var line = COLLADA.LogLevelToString(level) + ": " + escapeHTML(message);
        $("#log").append("[" + name + "] " + line + "\n");
    }
    function clearLog() {
        $("#log").text("");
    }
    function timeStart(name) {
        //writeProgress(name + " started");
    }
    function timeEnd(name) {
        //writeProgress(name + " finished (" + (endTime - startTime).toFixed(2) + "ms)");
    }
// ----------------------------------------------------------------------------
// Reset
// ----------------------------------------------------------------------------
    function reset() {
        resetInput();
        resetOutput();
    }
    function resetInput() {
        _AssetUpload.conversion_data.s0_source = "";
        _AssetUpload.conversion_data.s0_animations = null;
        updateUIInput();
    }
    function resetOutput() {
        _AssetUpload.conversion_data.stage = -1;
        _AssetUpload.conversion_data.exception = null;
        _AssetUpload.conversion_data.s1_xml = null;
        _AssetUpload.conversion_data.s2_loaded = null;
        _AssetUpload.conversion_data.s3_converted = null;
        _AssetUpload.conversion_data.s4_exported_custom = null;
        _AssetUpload.conversion_data.s5_exported_threejs = null;
        renderSetModel(null, null);
        clearLog();
        updateUIOutput();
        updateUIProgress();
    }
// ----------------------------------------------------------------------------
// Renderer
// ----------------------------------------------------------------------------
    function renderSetModel(json, data) {

        console.log("rendersetmodel", json, data)
        renderer.setMesh(json, data);
    }
    function renderStartRendering() {
        renderTick(null);
    }
    function renderTick(timestamp) {
        if (renderer.tick(timestamp)) {
            requestAnimationFrame(renderTick);
        }
    }
// ----------------------------------------------------------------------------
// Download
// ----------------------------------------------------------------------------
    function downloadJSON(data, name) {
        var mime = "application/json";
        var url = COLLADA.Exporter.Utils.jsonToBlobURI(data, mime);
        downloadUrl(url, name, mime);
    }
    function previewJSON(data) {
        var str = stringify.stringify(data, { maxLength: 120 });
        $("#preview-data").val(str);
        $("#preview-modal").modal('show');
    }
    function downloadBinary(data, name) {
        var mime = "application/octet-stream";
        var url = COLLADA.Exporter.Utils.bufferToBlobURI(data, mime);
        downloadUrl(url, name, mime);
    }
    function downloadUrl(url, name, mime) {
        var a = $("#download-link")[0];
        a.href = url;
        a.download = name;
        a.type = mime;
        a.click();
        // TODO: Find a reliable way of releasing the blob URI,
        // so that the blob can be freed from memory.
    }
// ----------------------------------------------------------------------------
// UI
// ----------------------------------------------------------------------------
    function updateUIProgress() {
        if (_AssetUpload.conversion_data.stage >= 0) {
            $("#progress-container").removeClass("hidden");
            $("#progress-container").css("display", "");
            $("#progress").css("width", (100 * _AssetUpload.conversion_data.stage / 5).toFixed(1) + "%");
        }
        else {
            $("#progress-container").addClass("hidden");
        }
        if (_AssetUpload.conversion_data.stage >= 6) {
            $("#progress-container").fadeOut(2000);
        }
    }
    function updateUIInput() {
        if (_AssetUpload.conversion_data.s0_source.length > 0) {
            $("#drop-target-result").removeClass("hidden");
            $("#drop-target-instructions").addClass("hidden");
            $("#input_file_size").text("File loaded (" + fileSizeStr(_AssetUpload.conversion_data.s0_source.length) + ")");
            $("#convert").removeAttr("disabled");
        }
        else {
            $("#drop-target-result").addClass("hidden");
            $("#drop-target-instructions").removeClass("hidden");
            $("#convert").attr("disabled", "disabled");
        }
        if (_AssetUpload.conversion_data.s0_animations) {
            $("#input_animations").removeClass("hidden");
            $("#input_animations").text("Animation labels loaded (" + _AssetUpload.conversion_data.s0_animations.length + ")");
        }
        else {
            $("#input_animations").addClass("hidden");
        }
    }
    function updateUIOutput() {
        if (_AssetUpload.conversion_data.s4_exported_custom) {
            var data = _AssetUpload.conversion_data.s4_exported_custom.json;
            var binary = _AssetUpload.conversion_data.s4_exported_custom.data;
            // Geometry complexity
            var geometry_complexity = "";
            geometry_complexity += data.chunks.length + " chunks";
            var tris = 0;
            var verts = 0;
            data.chunks.forEach(function (chunk) {
                tris += chunk.triangle_count;
                verts += chunk.vertex_count;
            });
            geometry_complexity += ", " + tris + " triangles, " + verts + " vertices";
            $("#output-geometry-complexity").text(geometry_complexity);
            // Animation complexity
            var animation_complexity = "";
            animation_complexity += data.bones.length + " bones";
            animation_complexity += ", ";
            animation_complexity += data.animations.length + " animations";
            animation_complexity += ", ";
            animation_complexity += data.animations.reduce(function (prev, cur) { return prev + cur.frames; }, 0) + " keyframes";
            $("#output-animation-complexity").text(animation_complexity);
            // Geometry size
            var bbox = data.info.bounding_box;
            var geometry_size = "";
            if (bbox) {
                geometry_size += "[" + bbox.min[0].toFixed(2) + "," + bbox.min[1].toFixed(2) + "," + bbox.min[2].toFixed(2) + "]";
                geometry_size += "  -  ";
                geometry_size += "[" + bbox.max[0].toFixed(2) + "," + bbox.max[1].toFixed(2) + "," + bbox.max[2].toFixed(2) + "]";
            }
            $("#output-geometry-size").text(geometry_size);
            // Rendered chunks
            $("#output-chunk").append('<option value="-1" selected>All</option>');
            for (var i = 0; i < data.chunks.length; ++i) {
                var chunk_name = data.chunks[i].name || ("Chunk " + i);
                $("#output-chunk").append('<option value="' + (i) + '">' + chunk_name + '</option>');
            }
            for (var i = 0; i < data.animations.length; ++i) {
                var animation_name = data.animations[i].name || ("Animation " + i);
                $("#output-animation").append('<option value="' + (i) + '">' + animation_name + '</option>');
            }
            // File sizes
            $("#output-custom-json .output-size").text(fileSizeStr(JSON.stringify(data).length));
            $("#output-custom-binary .output-size").text(fileSizeStr(binary.length));
            $("#output-custom-json button").removeAttr("disabled");
            $("#output-custom-binary button").removeAttr("disabled");
        }
        else {
            $("#output-geometry-complexity").text("");
            $("#output-animation-complexity").text("");
            $("#output-geometry-size").text("");
            $("#output-chunk").find('option').remove();
            $("#output-animation").find('option').remove();
            // Output
            $("#output-custom-json .output-size").text("");
            $("#output-custom-binary .output-size").text("");
            $("#output-custom-json button").attr("disabled", "disabled");
            $("#output-custom-binary button").attr("disabled", "disabled");
        }
        if (_AssetUpload.conversion_data.s5_exported_threejs) {
            var threejs_data = _AssetUpload.conversion_data.s5_exported_threejs;
            $("#output-threejs .output-size").text(fileSizeStr(JSON.stringify(threejs_data).length));
            $("#output-threejs button").removeAttr("disabled");
        }
        else {
            $("#output-threejs .output-size").text("");
            $("#output-threejs button").attr("disabled", "disabled");
        }
    }
// ----------------------------------------------------------------------------
// Drag & Drop
// ----------------------------------------------------------------------------
    function onFileDrag(ev) {
        ev.preventDefault();
    }
    function onFileDrop(ev) {
        console.log("Something dropped.");
        ev.stopPropagation();
        ev.preventDefault();
        var dt = ev.originalEvent.dataTransfer;
        if (!dt) {
            writeProgress("Your browser does not support drag&drop for files (?).");
            return;
        }
        var filelist = dt.files;
        var files = [];
        for (var i = 0; i < filelist.length; ++i) {
            files.push(filelist[i]);
        }
        files = files.sort(function (a, b) { return b.size - a.size; });
        switch (files.length) {
            case 0:
                writeProgress("You did not drop a file. Try dragging and dropping a file instead.");
                break;
            case 1:
                onFileLoad(files[0]);
                break;
            case 2:
                onFileLoad(files[0], files[1]);
                break;
            default:
                writeProgress("You dropped too many files. Please only drop a single file.");
        }
        ;
    }
    function readTextFile(file, name, callback) {
        // File reader
        var reader = new FileReader();
        reader.onload = function () {
            timeEnd("Reading " + name);
            var result = reader.result;
            callback(result);
        };
        reader.onerror = function () {
            writeProgress("Error reading " + name + ".");
        };
        timeStart("Reading " + name);
        // Read
        reader.readAsText(file);
    }
    function onFileLoad(file, animations) {
        // Reset all data
        reset();
        // Read the
        if (animations) {
            readTextFile(animations, "animations", function (result) {
                animationSetup(result);
                readTextFile(file, "file", function (result2) { return convertSetup(result2); });
            });
        }
        else {
            readTextFile(file, "file", function (result) { return convertSetup(result); });
        }
    }
// ----------------------------------------------------------------------------
// Conversion
// ----------------------------------------------------------------------------
    function animationSetup(src) {
        _AssetUpload.conversion_data.s0_animations = parseAnimations.parse(src);
    }
    function convertSetup(src) {
        // Set the source data
        _AssetUpload.conversion_data.s0_source = src;
        _AssetUpload.conversion_data.stage = 1;
        updateUIInput();
    }
    function convertTick() {
        
        try {
            switch (_AssetUpload.conversion_data.stage) {
                case 1:
                    convertParse();
                    break;
                case 2:
                    convertLoad();
                    break;
                case 3:
                    convertConvert();
                    break;
                case 4:
                    convertExportCustom();
                    break;
                case 5:
                    convertExportThreejs();
                    updateUIOutput();
                    break;
                case 6:
                debugger;
                    convertRenderPreview();
                    break;
                case 7:
                    break;
                default:
                    throw new Error("Unknown stage");
            }
        }
        catch (e) {
            _AssetUpload.conversion_data.exception = true;
        }
        // Update the progress bar
        updateUIProgress();
    }
    function convertNextStage() {
        _AssetUpload.conversion_data.stage++;
        setTimeout(convertTick, 10);
    }
    function convertParse() {
        // Parser
        var parser = new DOMParser();
        // Parse
        timeStart("XML parsing");
        _AssetUpload.conversion_data.s1_xml = parser.parseFromString(_AssetUpload.conversion_data.s0_source, "text/xml");
        timeEnd("XML parsing");
        // Next stage
        convertNextStage();
    }
    function convertLoad() {
        // Loader
        var loader = new COLLADA.Loader.ColladaLoader();
        var loaderlog = new COLLADA.LogCallback;
        loaderlog.onmessage = function (message, level) {
            writeLog("loader", message, level);
        };
        loader.log = new COLLADA.LogFilter(loaderlog, 3 /* Info */);
        // Load
        timeStart("COLLADA parsing");
        _AssetUpload.conversion_data.s2_loaded = loader.loadFromXML("id", _AssetUpload.conversion_data.s1_xml);
        console.log(_AssetUpload.conversion_data.s2_loaded)
        timeEnd("COLLADA parsing");
        // Next stage
        convertNextStage();
    }
    function convertConvert() {
        // Converter
        var converter = new COLLADA.Converter.ColladaConverter();
        var converterlog = converter.log = new COLLADA.LogCallback;
        converterlog.onmessage = function (message, level) {
            writeLog("converter", message, level);
        };
        converter.options = new COLLADA.Converter.Options();
        converter.options.flattenHierarchy = false;
        converter.options.animationLabels.value = _AssetUpload.conversion_data.s0_animations;
        converter.options.useAnimationLabels.value = _AssetUpload.conversion_data.s0_animations != null;
        converter.options.createSkeleton = false;
        // Convert
        timeStart("COLLADA conversion");
        _AssetUpload.conversion_data.s3_converted = converter.convert(_AssetUpload.conversion_data.s2_loaded);
        console.log(_AssetUpload.conversion_data.s3_converted)
        timeEnd("COLLADA conversion");
        // Next stage
        convertNextStage();
    }
    function convertExportCustom() {
        // Exporter
        var exporter = new COLLADA.Exporter.ColladaExporter();
        var exporterlog = exporter.log = new COLLADA.LogCallback;
        exporterlog.onmessage = function (message, level) {
            writeLog("converter", message, level);
        };
        // Export
        timeStart("COLLADA export");
        _AssetUpload.conversion_data.s4_exported_custom = exporter.export(_AssetUpload.conversion_data.s3_converted);
        console.log(_AssetUpload.conversion_data.s4_exported_custom)
        timeEnd("COLLADA export");
        // Next stage
        convertNextStage();
    }
    function convertExportThreejs() {
        // Exporter2
        var exporter = new COLLADA.Threejs.ThreejsExporter();
        var exporterlog = exporter.log = new COLLADA.LogCallback;
        exporterlog.onmessage = function (message, level) {
            writeLog("threejs", message, level);
        };
        // Export2
        timeStart("Threejs export");
        _AssetUpload.conversion_data.s5_exported_threejs = exporter.export(_AssetUpload.conversion_data.s3_converted);
        console.log(_AssetUpload.conversion_data.s5_exported_threejs)
        timeEnd("Threejs export");
        // Next stage
        convertNextStage();
    }
    function convertRenderPreview() {
        console.log("render model")
        timeStart("WebGL loading");
        renderSetModel(_AssetUpload.conversion_data.s4_exported_custom.json, _AssetUpload.conversion_data.s4_exported_custom.data);
        timeEnd("WebGL loading");
        timeStart("WebGL rendering");
        renderStartRendering();
        timeEnd("WebGL rendering");
        // Next stage
        convertNextStage();
    }
    function onConvertClick() {
        // Delete any previously converted data
        resetOutput();
        // Start the conversion
        _AssetUpload.conversion_data.stage = 1;
        setTimeout(convertTick, 10);
    }

    function initialize() {
        //$(document.head).append('<script type="text/javascript" src="vwf/view/editorview/lib/collada.js"></script>');

        
        if (!$("#assetUpload").length) {
           $(document.body).append('<div id="assetUpload" style="display: flex;"></div>');
           $("#assetUpload").dialog();
        }

        this.timestamps = {};
        this.conversion_data = {
            stage: null,
            exception: null,
            s0_source: null,
            s0_animations: null,
            s1_xml: null,
            s2_loaded: null,
            s3_converted: null,
            s4_exported_custom: null,
            s5_exported_threejs: null
        };

        $('#assetUpload').append('<div id="uploadWrapper" style="display: flex;"></div>');
        $('#uploadWrapper').append('<div id="uploadcol1" style="float: left;"></div><div id="uploadcol2" style="float: left;"></div>');
        $('#uploadcol1').append('<canvas class="canvas" id="canvas" width="300" height="200"></canvas>');
        $('#uploadcol2').append('<div id="drop-target"></div>');
        $('#uploadcol2').append('<button type="button" class="k-button" id="convert" disabled>Preview Model</button>');
        $('#drop-target').append('<div id="drop-target-instructions"><p class="drop-target-title">Drop your COLLADA (.dae) file here!</p></div>');
        $('#drop-target').append('<div id="drop-target-result" class="hidden"><p class="drop-target-title" id="input_file_size">File loaded (0 kB).</p><p class="drop-target-title" id="input_animations">Animations loaded (0).</p></div>');




        var ThreejsRenderer = (function () {
            function ThreejsRenderer() {
                this.canvas = null;
                this.camera = null;
                this.scene = null;
                this.renderer = null;
                this.mesh = null;
                this.lights = [];
                this.grid = null;
                this.axes = null;
                this.stats = null;
                this.last_timestamp = null;
                this.time = 0;
                this.render_loops = 1;
                this.animation_index = 0;
            }
            ThreejsRenderer.prototype.init = function (canvas) {
                var _this = this;
                this.canvas = canvas;
                // Camera
                this.camera = new THREE.PerspectiveCamera(27, canvas.width / canvas.height, 1, 10);
                this.resetCamera();
                // Scene
                this.scene = new THREE.Scene();
                // Lights
                var light0 = new THREE.AmbientLight(0x444444);
                this.lights.push(light0);
                this.scene.add(light0);
                var light1 = new THREE.DirectionalLight(0xffffff, 0.5);
                light1.position.set(1, 1, 1);
                this.lights.push(light1);
                this.scene.add(light1);
                var light2 = new THREE.DirectionalLight(0xffffff, 1.5);
                light2.position.set(0, -1, 0);
                this.lights.push(light2);
                this.scene.add(light2);
                // Grid
                var gridXY = new THREE.GridHelper(5, 1);
                gridXY.rotation.x = Math.PI / 2;
                gridXY.position.z = -0.001;
                this.scene.add(gridXY);
                // Axes
                this.axes = new THREE.AxisHelper(2);
                this.scene.add(this.axes);
                // Renderer
                this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
                this.renderer.setSize(canvas.width, canvas.height);
                this.renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.5), 1);
                this.renderer.gammaInput = true;
                this.renderer.gammaOutput = true;
                // Stats block
                //this.stats = new Stats();
                //canvas.parentNode.insertBefore(this.stats.domElement, canvas.parentNode.firstChild);
                // Events
                window.addEventListener('resize', function () {
                    _this.camera.aspect = _this.canvas.width / _this.canvas.height;
                    _this.camera.updateProjectionMatrix();
                    _this.renderer.setSize(_this.canvas.width, _this.canvas.height);
                }, false);
                this.drawScene();
            };
            ThreejsRenderer.getObjectRadius = function (object) {
                var _this = this;
                if (object instanceof THREE.Mesh) {
                    // Object is a mesh
                    var mesh = object;
                    if (mesh.geometry) {
                        if (!mesh.geometry.boundingSphere) {
                            mesh.geometry.computeBoundingSphere();
                        }
                        return mesh.geometry.boundingSphere.radius;
                    }
                    else {
                        return 0;
                    }
                }
                else if (object.children.length > 0) {
                    // Object is a container object
                    var result = 0;
                    object.children.forEach(function (child) {
                        result = Math.max(result, _this.getObjectRadius(child) + child.position.length());
                    });
                    return result;
                }
                else {
                    // Object is empty
                    return 0;
                }
            };
            /** Zooms the camera so that it shows the object */
            ThreejsRenderer.prototype.zoomToObject = function (scale) {
                if (this.mesh) {
                    var r = Math.max(0.01, ThreejsRenderer.getObjectRadius(this.mesh));
                    this.zoomTo(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, r * scale);
                }
                else {
                    this.zoomTo(0, 0, 0, 1 * scale);
                }
            };
            /** Zooms the camera so that it shows the given coordinates */
            ThreejsRenderer.prototype.zoomTo = function (x, y, z, r) {
                this.camera.position.set(x + 1 * r, y + 0.3 * r, z + 0.5 * r);
                this.camera.up.set(0, 0, 1);
                this.camera.lookAt(new THREE.Vector3(x, y, z));
                this.camera.far = 2 * r + 20;
                this.camera.updateProjectionMatrix();
            };
            /** Resets the camera */
            ThreejsRenderer.prototype.resetCamera = function () {
                this.zoomToObject(10);
            };
            /** Main render loop */
            ThreejsRenderer.prototype.tick = function (timestamp) {
                // Abort if there is nothing to render
                if (!this.mesh) {
                    this.resetCamera();
                    this.drawScene();
                    return false;
                }
                // Timing
                var delta_time = 0;
                if (timestamp === null) {
                    this.last_timestamp = null;
                    this.time = 0;
                }
                else if (this.last_timestamp === null) {
                    this.last_timestamp = timestamp;
                    this.time = 0;
                }
                else {
                    delta_time = timestamp - this.last_timestamp;
                    this.last_timestamp = timestamp;
                }
                // Increase the number of loops to measure performance
                // FPS is otherwise bounded by the vertical sync
                var loops = this.render_loops || 1;
                for (var i = 0; i < loops; ++i) {
                    //this.stats.begin();
                    this.updateAnimation(delta_time / loops);
                    this.drawScene();
                    //this.stats.end();
                }
                return true;
            };
            /** Draws the scene */
            ThreejsRenderer.prototype.drawScene = function () {
                t = this; this.renderer.render(this.scene, this.camera);
            };
            /** Updates skeletal animation data */
            ThreejsRenderer.prototype.updateAnimation = function (delta_time) {
                this.time += delta_time / (1000);
                var mesh = this.mesh;
                var data = mesh.userData;
                if (data.skeleton) {
                    if (data.model.animations.length > 0) {
                        var index = this.animation_index;
                        if (index < 0)
                            index = 0;
                        if (index >= data.model.animations.length)
                            index = data.model.animations.length;
                        RMXSkeletalAnimation.sampleAnimation(data.model.animations[index], data.model.skeleton, data.skeleton.pose, this.time * 25);
                    }
                    else {
                        RMXSkeletalAnimation.resetPose(data.model.skeleton, data.skeleton.pose);
                    }
                    var gl = this.renderer.context;
                    data.skeleton.update(gl);
                }
            };
            ThreejsRenderer.prototype.setAnimation = function (index) {
                this.animation_index = index;
                this.time = 0;
            };
            ThreejsRenderer.prototype.setChunk = function (index) {
                var mesh = this.mesh;
                mesh.children.forEach(function (child, i) {
                    child.visible = index === -1 || index === i;
                });
            };
            ThreejsRenderer.prototype.setMesh = function (json, data) {

                this.resetMesh();
                if (!json || !data) {
                    return;
                }
                var loader = new RMXModelLoader();
                console.log(loader)
                var model = loader.loadModel(json, data.buffer);
                console.log(model)
                var loader2 = new ThreejsModelLoader;

                var model2 = loader2.createModel(model);
                console.log(model2, model)
                this.mesh = model2.instanciate();
                this.scene.add(this.mesh);

                this.zoomToObject(5);
            };
            ThreejsRenderer.prototype.resetMesh = function () {
                if (this.mesh) {
                    this.scene.remove(this.mesh);
                    this.mesh = null;
                }
            };
            return ThreejsRenderer;
        })();


        // Initialize WebGL
        var canvas = $("#canvas")[0];
        renderer = new ThreejsRenderer();
        renderer.init(canvas);
        this.renderer = renderer;
        // Create option elements
        //var optionsForm = $("#form-options");
        //optionElements.push(new ColladaConverterOption(options.createSkeleton, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.enableAnimations, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.animationFps, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.worldTransform, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.worldTransformScale, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.worldTransformRotationAxis, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.worldTransformRotationAngle, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.sortBones, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.applyBindShape, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.singleBufferPerGeometry, optionsForm));
        //optionElements.push(new ColladaConverterOption(options.truncateResampledAnimations, optionsForm));
        //// Register events
        $("#drop-target").on("dragover", onFileDrag);
        $("#drop-target").on("drop", onFileDrop);
        $("#convert").click(onConvertClick);
        //$("#output-custom-json .output-download").click(function () { return downloadJSON(conversion_data.s4_exported_custom.json, "model.json"); });
        //$("#output-custom-binary .output-download").click(function () { return downloadBinary(conversion_data.s4_exported_custom.data, "model.bin"); });
        //$("#output-threejs .output-download").click(function () { return downloadJSON(conversion_data.s5_exported_threejs, "model-threejs.json"); });
        //$("#output-custom-json .output-view").click(function () { return previewJSON(conversion_data.s4_exported_custom.json); });
        //$("#output-custom-binary .output-view").click(function () { return alert("Binary preview not implemented"); });
        //$("#output-threejs .output-view").click(function () { return previewJSON(conversion_data.s5_exported_threejs); });
        //$("#close-preview").click(function () { return $("#preview-modal").modal('hide'); });
        //$("#output-chunk").change(function () { return renderer.setChunk(+$("#output-chunk").val()); });
        //$("#output-animation").change(function () { return renderer.setAnimation(+$("#output-animation").val()); });
        // Update all UI elements
        //reset();
        //writeProgress("Converter initialized");










        this.BuildGUI = function() {

        }



        this.show = function() {
           // $("#assetUpload").data("kendoWindow").open();
           $("#assetUpload").dialog('open');
        }


    }
});