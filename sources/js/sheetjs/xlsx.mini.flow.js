/*! xlsx.js (C) 2013-present SheetJS -- http://sheetjs.com */
/* vim: set ts=2: */
/*exported XLSX */
/*global global, exports, module, require:false, process:false, Buffer:false, ArrayBuffer:false, DataView:false, Deno:false, Set:false, Float32Array:false */
var XLSX = {};
function make_xlsx_lib(XLSX){
XLSX.version = '0.20.2';
var current_codepage = 1200, current_ansi = 1252;
/*:: declare var cptable:any; */
/*global cptable:true, window */
var $cptable;

var VALID_ANSI = [ 874, 932, 936, 949, 950, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258, 10000 ];
/* ECMA-376 Part I 18.4.1 charset to codepage mapping */
var CS2CP = ({
	0:    1252, /* ANSI */
	1:   65001, /* DEFAULT */
	2:   65001, /* SYMBOL */
	77:  10000, /* MAC */
	128:   932, /* SHIFTJIS */
	129:   949, /* HANGUL */
	130:  1361, /* JOHAB */
	134:   936, /* GB2312 */
	136:   950, /* CHINESEBIG5 */
	161:  1253, /* GREEK */
	162:  1254, /* TURKISH */
	163:  1258, /* VIETNAMESE */
	177:  1255, /* HEBREW */
	178:  1256, /* ARABIC */
	186:  1257, /* BALTIC */
	204:  1251, /* RUSSIAN */
	222:   874, /* THAI */
	238:  1250, /* EASTEUROPE */
	255:  1252, /* OEM */
	69:   6969  /* MISC */
}/*:any*/);

var set_ansi = function(cp/*:number*/) { if(VALID_ANSI.indexOf(cp) == -1) return; current_ansi = CS2CP[0] = cp; };
function reset_ansi() { set_ansi(1252); }

var set_cp = function(cp/*:number*/) { current_codepage = cp; set_ansi(cp); };
function reset_cp() { set_cp(1200); reset_ansi(); }

function char_codes(data/*:string*/)/*:Array<number>*/ { var o/*:Array<number>*/ = []; for(var i = 0, len = data.length; i < len; ++i) o[i] = data.charCodeAt(i); return o; }

function utf16leread(data/*:string*/)/*:string*/ {
	var o/*:Array<string>*/ = [];
	for(var i = 0; i < (data.length>>1); ++i) o[i] = String.fromCharCode(data.charCodeAt(2*i) + (data.charCodeAt(2*i+1)<<8));
	return o.join("");
}
function utf16lereadu(data/*:Uint8Array*/)/*:string*/ {
	var o/*:Array<string>*/ = [];
	for(var i = 0; i < (data.length>>1); ++i) o[i] = String.fromCharCode(data[2*i] + (data[2*i+1]<<8));
	return o.join("");
}
function utf16beread(data/*:string*/)/*:string*/ {
	var o/*:Array<string>*/ = [];
	for(var i = 0; i < (data.length>>1); ++i) o[i] = String.fromCharCode(data.charCodeAt(2*i+1) + (data.charCodeAt(2*i)<<8));
	return o.join("");
}

var debom = function(data/*:string*/)/*:string*/ {
	var c1 = data.charCodeAt(0), c2 = data.charCodeAt(1);
	if(c1 == 0xFF && c2 == 0xFE) return utf16leread(data.slice(2));
	if(c1 == 0xFE && c2 == 0xFF) return utf16beread(data.slice(2));
	if(c1 == 0xFEFF) return data.slice(1);
	return data;
};

var _getchar = function _gc1(x/*:number*/)/*:string*/ { return String.fromCharCode(x); };
var _getansi = function _ga1(x/*:number*/)/*:string*/ { return String.fromCharCode(x); };

function set_cptable(cptable) {
	$cptable = cptable;
	set_cp = function(cp/*:number*/) { current_codepage = cp; set_ansi(cp); };
	debom = function(data/*:string*/) {
		if(data.charCodeAt(0) === 0xFF && data.charCodeAt(1) === 0xFE) { return $cptable.utils.decode(1200, char_codes(data.slice(2))); }
		return data;
	};
	_getchar = function _gc2(x/*:number*/)/*:string*/ {
		if(current_codepage === 1200) return String.fromCharCode(x);
		return $cptable.utils.decode(current_codepage, [x&255,x>>8])[0];
	};
	_getansi = function _ga2(x/*:number*/)/*:string*/ {
		return $cptable.utils.decode(current_ansi, [x])[0];
	};
	cpdoit();
}
var DENSE = null;
var DIF_XL = true;
var Base64_map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
function Base64_encode(input) {
  var o = "";
  var c1 = 0, c2 = 0, c3 = 0, e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  for (var i = 0; i < input.length; ) {
    c1 = input.charCodeAt(i++);
    e1 = c1 >> 2;
    c2 = input.charCodeAt(i++);
    e2 = (c1 & 3) << 4 | c2 >> 4;
    c3 = input.charCodeAt(i++);
    e3 = (c2 & 15) << 2 | c3 >> 6;
    e4 = c3 & 63;
    if (isNaN(c2)) {
      e3 = e4 = 64;
    } else if (isNaN(c3)) {
      e4 = 64;
    }
    o += Base64_map.charAt(e1) + Base64_map.charAt(e2) + Base64_map.charAt(e3) + Base64_map.charAt(e4);
  }
  return o;
}
function Base64_encode_pass(input) {
  var o = "";
  var c1 = 0, c2 = 0, c3 = 0, e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  for (var i = 0; i < input.length; ) {
    c1 = input.charCodeAt(i++);
    if (c1 > 255)
      c1 = 95;
    e1 = c1 >> 2;
    c2 = input.charCodeAt(i++);
    if (c2 > 255)
      c2 = 95;
    e2 = (c1 & 3) << 4 | c2 >> 4;
    c3 = input.charCodeAt(i++);
    if (c3 > 255)
      c3 = 95;
    e3 = (c2 & 15) << 2 | c3 >> 6;
    e4 = c3 & 63;
    if (isNaN(c2)) {
      e3 = e4 = 64;
    } else if (isNaN(c3)) {
      e4 = 64;
    }
    o += Base64_map.charAt(e1) + Base64_map.charAt(e2) + Base64_map.charAt(e3) + Base64_map.charAt(e4);
  }
  return o;
}
function Base64_encode_arr(input) {
  var o = "";
  var c1 = 0, c2 = 0, c3 = 0, e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  for (var i = 0; i < input.length; ) {
    c1 = input[i++];
    e1 = c1 >> 2;
    c2 = input[i++];
    e2 = (c1 & 3) << 4 | c2 >> 4;
    c3 = input[i++];
    e3 = (c2 & 15) << 2 | c3 >> 6;
    e4 = c3 & 63;
    if (isNaN(c2)) {
      e3 = e4 = 64;
    } else if (isNaN(c3)) {
      e4 = 64;
    }
    o += Base64_map.charAt(e1) + Base64_map.charAt(e2) + Base64_map.charAt(e3) + Base64_map.charAt(e4);
  }
  return o;
}
function Base64_decode(input) {
  var o = "";
  var c1 = 0, c2 = 0, c3 = 0, e1 = 0, e2 = 0, e3 = 0, e4 = 0;
  if (input.slice(0, 5) == "data:") {
    var i = input.slice(0, 1024).indexOf(";base64,");
    if (i > -1)
      input = input.slice(i + 8);
  }
  input = input.replace(/[^\w\+\/\=]/g, "");
  for (var i = 0; i < input.length; ) {
    e1 = Base64_map.indexOf(input.charAt(i++));
    e2 = Base64_map.indexOf(input.charAt(i++));
    c1 = e1 << 2 | e2 >> 4;
    o += String.fromCharCode(c1);
    e3 = Base64_map.indexOf(input.charAt(i++));
    c2 = (e2 & 15) << 4 | e3 >> 2;
    if (e3 !== 64) {
      o += String.fromCharCode(c2);
    }
    e4 = Base64_map.indexOf(input.charAt(i++));
    c3 = (e3 & 3) << 6 | e4;
    if (e4 !== 64) {
      o += String.fromCharCode(c3);
    }
  }
  return o;
}
var has_buf = /*#__PURE__*/(function() { return typeof Buffer !== 'undefined' && typeof process !== 'undefined' && typeof process.versions !== 'undefined' && !!process.versions.node; })();

var Buffer_from = /*#__PURE__*/(function() {
	if(typeof Buffer !== 'undefined') {
		var nbfs = !Buffer.from;
		if(!nbfs) try { Buffer.from("foo", "utf8"); } catch(e) { nbfs = true; }
		return nbfs ? function(buf, enc) { return (enc) ? new Buffer(buf, enc) : new Buffer(buf); } : Buffer.from.bind(Buffer);
	}
	return function() {};
})();
var buf_utf16le = /*#__PURE__*/(function() {
	if(typeof Buffer === 'undefined') return false;
	var x = Buffer_from([65,0]);
	if(!x) return false;
	var o = x.toString("utf16le");
	return o.length == 1;
})();


function new_raw_buf(len/*:number*/) {
	/* jshint -W056 */
	if(has_buf) return Buffer.alloc ? Buffer.alloc(len) : new Buffer(len);
	return typeof Uint8Array != "undefined" ? new Uint8Array(len) : new Array(len);
	/* jshint +W056 */
}

function new_unsafe_buf(len/*:number*/) {
	/* jshint -W056 */
	if(has_buf) return Buffer.allocUnsafe ? Buffer.allocUnsafe(len) : new Buffer(len);
	return typeof Uint8Array != "undefined" ? new Uint8Array(len) : new Array(len);
	/* jshint +W056 */
}

var s2a = function s2a(s/*:string*/)/*:any*/ {
	if(has_buf) return Buffer_from(s, "binary");
	return s.split("").map(function(x/*:string*/)/*:number*/{ return x.charCodeAt(0) & 0xff; });
};

function s2ab(s/*:string*/)/*:any*/ {
	if(typeof ArrayBuffer === 'undefined') return s2a(s);
	var buf = new ArrayBuffer(s.length), view = new Uint8Array(buf);
	for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
	return buf;
}

function a2s(data/*:any*/)/*:string*/ {
	if(Array.isArray(data)) return data.map(function(c) { return String.fromCharCode(c); }).join("");
	var o/*:Array<string>*/ = []; for(var i = 0; i < data.length; ++i) o[i] = String.fromCharCode(data[i]); return o.join("");
}

function a2u(data/*:Array<number>*/)/*:Uint8Array*/ {
	if(typeof Uint8Array === 'undefined') throw new Error("Unsupported");
	return new Uint8Array(data);
}

function ab2a(data/*:ArrayBuffer|Uint8Array*/)/*:Array<number>*/ {
	if(typeof ArrayBuffer == 'undefined') throw new Error("Unsupported");
	if(data instanceof ArrayBuffer) return ab2a(new Uint8Array(data));
	/*:: if(data instanceof ArrayBuffer) throw new Error("unreachable"); */
	var o = new Array(data.length);
	for(var i = 0; i < data.length; ++i) o[i] = data[i];
	return o;
}

var bconcat = has_buf ? function(bufs) { return Buffer.concat(bufs.map(function(buf) { return Buffer.isBuffer(buf) ? buf : Buffer_from(buf); })); } : function(bufs) {
	if(typeof Uint8Array !== "undefined") {
		var i = 0, maxlen = 0;
		for(i = 0; i < bufs.length; ++i) maxlen += bufs[i].length;
		var o = new Uint8Array(maxlen);
		var len = 0;
		for(i = 0, maxlen = 0; i < bufs.length; maxlen += len, ++i) {
			len = bufs[i].length;
			if(bufs[i] instanceof Uint8Array) o.set(bufs[i], maxlen);
			else if(typeof bufs[i] == "string") o.set(new Uint8Array(s2a(bufs[i])), maxlen);
			else o.set(new Uint8Array(bufs[i]), maxlen);
		}
		return o;
	}
	return [].concat.apply([], bufs.map(function(buf) { return Array.isArray(buf) ? buf : [].slice.call(buf); }));
};

function utf8decode(content/*:string*/) {
	var out = [], widx = 0, L = content.length + 250;
	var o = new_raw_buf(content.length + 255);
	for(var ridx = 0; ridx < content.length; ++ridx) {
		var c = content.charCodeAt(ridx);
		if(c < 0x80) o[widx++] = c;
		else if(c < 0x800) {
			o[widx++] = (192|((c>>6)&31));
			o[widx++] = (128|(c&63));
		} else if(c >= 0xD800 && c < 0xE000) {
			c = (c&1023)+64;
			var d = content.charCodeAt(++ridx)&1023;
			o[widx++] = (240|((c>>8)&7));
			o[widx++] = (128|((c>>2)&63));
			o[widx++] = (128|((d>>6)&15)|((c&3)<<4));
			o[widx++] = (128|(d&63));
		} else {
			o[widx++] = (224|((c>>12)&15));
			o[widx++] = (128|((c>>6)&63));
			o[widx++] = (128|(c&63));
		}
		if(widx > L) {
			out.push(o.slice(0, widx));
			widx = 0;
			o = new_raw_buf(65535);
			L = 65530;
		}
	}
	out.push(o.slice(0, widx));
	return bconcat(out);
}

var chr0 = /\u0000/g, chr1 = /[\u0001-\u0006]/g;
/*::
declare type Block = any;
declare type BufArray = {
	newblk(sz:number):Block;
	next(sz:number):Block;
	end():any;
	push(buf:Block):void;
};

type RecordHopperCB = {(d:any, Rn:string, RT:number):?boolean;};

type EvertType = {[string]:string};
type EvertNumType = {[string]:number};
type EvertArrType = {[string]:Array<string>};

type StringConv = {(string):string};

*/
/* ssf.js (C) 2013-present SheetJS -- http://sheetjs.com */
/*jshint -W041 */
function _strrev(x/*:string*/)/*:string*/ { var o = "", i = x.length-1; while(i>=0) o += x.charAt(i--); return o; }
function pad0(v/*:any*/,d/*:number*/)/*:string*/{var t=""+v; return t.length>=d?t:fill('0',d-t.length)+t;}
function pad_(v/*:any*/,d/*:number*/)/*:string*/{var t=""+v;return t.length>=d?t:fill(' ',d-t.length)+t;}
function rpad_(v/*:any*/,d/*:number*/)/*:string*/{var t=""+v; return t.length>=d?t:t+fill(' ',d-t.length);}
function pad0r1(v/*:any*/,d/*:number*/)/*:string*/{var t=""+Math.round(v); return t.length>=d?t:fill('0',d-t.length)+t;}
function pad0r2(v/*:any*/,d/*:number*/)/*:string*/{var t=""+v; return t.length>=d?t:fill('0',d-t.length)+t;}
var p2_32 = /*#__PURE__*/Math.pow(2,32);
function pad0r(v/*:any*/,d/*:number*/)/*:string*/{if(v>p2_32||v<-p2_32) return pad0r1(v,d); var i = Math.round(v); return pad0r2(i,d); }
/* yes, in 2022 this is still faster than string compare */
function SSF_isgeneral(s/*:string*/, i/*:?number*/)/*:boolean*/ { i = i || 0; return s.length >= 7 + i && (s.charCodeAt(i)|32) === 103 && (s.charCodeAt(i+1)|32) === 101 && (s.charCodeAt(i+2)|32) === 110 && (s.charCodeAt(i+3)|32) === 101 && (s.charCodeAt(i+4)|32) === 114 && (s.charCodeAt(i+5)|32) === 97 && (s.charCodeAt(i+6)|32) === 108; }
var days/*:Array<Array<string> >*/ = [
	['Sun', 'Sunday'],
	['Mon', 'Monday'],
	['Tue', 'Tuesday'],
	['Wed', 'Wednesday'],
	['Thu', 'Thursday'],
	['Fri', 'Friday'],
	['Sat', 'Saturday']
];
var months/*:Array<Array<string> >*/ = [
	['J', 'Jan', 'January'],
	['F', 'Feb', 'February'],
	['M', 'Mar', 'March'],
	['A', 'Apr', 'April'],
	['M', 'May', 'May'],
	['J', 'Jun', 'June'],
	['J', 'Jul', 'July'],
	['A', 'Aug', 'August'],
	['S', 'Sep', 'September'],
	['O', 'Oct', 'October'],
	['N', 'Nov', 'November'],
	['D', 'Dec', 'December']
];
function SSF_init_table(t/*:any*/) {
	if(!t) t = {};
	t[0]=  'General';
	t[1]=  '0';
	t[2]=  '0.00';
	t[3]=  '#,##0';
	t[4]=  '#,##0.00';
	t[9]=  '0%';
	t[10]= '0.00%';
	t[11]= '0.00E+00';
	t[12]= '# ?/?';
	t[13]= '# ??/??';
	t[14]= 'm/d/yy';
	t[15]= 'd-mmm-yy';
	t[16]= 'd-mmm';
	t[17]= 'mmm-yy';
	t[18]= 'h:mm AM/PM';
	t[19]= 'h:mm:ss AM/PM';
	t[20]= 'h:mm';
	t[21]= 'h:mm:ss';
	t[22]= 'm/d/yy h:mm';
	t[37]= '#,##0 ;(#,##0)';
	t[38]= '#,##0 ;[Red](#,##0)';
	t[39]= '#,##0.00;(#,##0.00)';
	t[40]= '#,##0.00;[Red](#,##0.00)';
	t[45]= 'mm:ss';
	t[46]= '[h]:mm:ss';
	t[47]= 'mmss.0';
	t[48]= '##0.0E+0';
	t[49]= '@';
	t[56]= '"上午/下午 "hh"時"mm"分"ss"秒 "';
	return t;
}
/* repeated to satiate webpack */
var table_fmt = {
	0:  'General',
	1:  '0',
	2:  '0.00',
	3:  '#,##0',
	4:  '#,##0.00',
	9:  '0%',
	10: '0.00%',
	11: '0.00E+00',
	12: '# ?/?',
	13: '# ??/??',
	14: 'm/d/yy',
	15: 'd-mmm-yy',
	16: 'd-mmm',
	17: 'mmm-yy',
	18: 'h:mm AM/PM',
	19: 'h:mm:ss AM/PM',
	20: 'h:mm',
	21: 'h:mm:ss',
	22: 'm/d/yy h:mm',
	37: '#,##0 ;(#,##0)',
	38: '#,##0 ;[Red](#,##0)',
	39: '#,##0.00;(#,##0.00)',
	40: '#,##0.00;[Red](#,##0.00)',
	45: 'mm:ss',
	46: '[h]:mm:ss',
	47: 'mmss.0',
	48: '##0.0E+0',
	49: '@',
	56: '"上午/下午 "hh"時"mm"分"ss"秒 "'
};

/* Defaults determined by systematically testing in Excel 2019 */

/* These formats appear to default to other formats in the table */
var SSF_default_map = {
	5:  37, 6:  38, 7:  39, 8:  40,         //  5 -> 37 ...  8 -> 40

	23:  0, 24:  0, 25:  0, 26:  0,         // 23 ->  0 ... 26 ->  0

	27: 14, 28: 14, 29: 14, 30: 14, 31: 14, // 27 -> 14 ... 31 -> 14

	50: 14, 51: 14, 52: 14, 53: 14, 54: 14, // 50 -> 14 ... 58 -> 14
	55: 14, 56: 14, 57: 14, 58: 14,
	59:  1, 60:  2, 61:  3, 62:  4,         // 59 ->  1 ... 62 ->  4

	67:  9, 68: 10,                         // 67 ->  9 ... 68 -> 10
	69: 12, 70: 13, 71: 14,                 // 69 -> 12 ... 71 -> 14
	72: 14, 73: 15, 74: 16, 75: 17,         // 72 -> 14 ... 75 -> 17
	76: 20, 77: 21, 78: 22,                 // 76 -> 20 ... 78 -> 22
	79: 45, 80: 46, 81: 47,                 // 79 -> 45 ... 81 -> 47
	82: 0                                   // 82 ->  0 ... 65536 -> 0 (omitted)
};


/* These formats technically refer to Accounting formats with no equivalent */
var SSF_default_str = {
	//  5 -- Currency,   0 decimal, black negative
	5:  '"$"#,##0_);\\("$"#,##0\\)',
	63: '"$"#,##0_);\\("$"#,##0\\)',

	//  6 -- Currency,   0 decimal, red   negative
	6:  '"$"#,##0_);[Red]\\("$"#,##0\\)',
	64: '"$"#,##0_);[Red]\\("$"#,##0\\)',

	//  7 -- Currency,   2 decimal, black negative
	7:  '"$"#,##0.00_);\\("$"#,##0.00\\)',
	65: '"$"#,##0.00_);\\("$"#,##0.00\\)',

	//  8 -- Currency,   2 decimal, red   negative
	8:  '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)',
	66: '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)',

	// 41 -- Accounting, 0 decimal, No Symbol
	41: '_(* #,##0_);_(* \\(#,##0\\);_(* "-"_);_(@_)',

	// 42 -- Accounting, 0 decimal, $  Symbol
	42: '_("$"* #,##0_);_("$"* \\(#,##0\\);_("$"* "-"_);_(@_)',

	// 43 -- Accounting, 2 decimal, No Symbol
	43: '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)',

	// 44 -- Accounting, 2 decimal, $  Symbol
	44: '_("$"* #,##0.00_);_("$"* \\(#,##0.00\\);_("$"* "-"??_);_(@_)'
};

function SSF_frac(x/*:number*/, D/*:number*/, mixed/*:?boolean*/)/*:Array<number>*/ {
	var sgn = x < 0 ? -1 : 1;
	var B = x * sgn;
	var P_2 = 0, P_1 = 1, P = 0;
	var Q_2 = 1, Q_1 = 0, Q = 0;
	var A = Math.floor(B);
	while(Q_1 < D) {
		A = Math.floor(B);
		P = A * P_1 + P_2;
		Q = A * Q_1 + Q_2;
		if((B - A) < 0.00000005) break;
		B = 1 / (B - A);
		P_2 = P_1; P_1 = P;
		Q_2 = Q_1; Q_1 = Q;
	}
	if(Q > D) { if(Q_1 > D) { Q = Q_2; P = P_2; } else { Q = Q_1; P = P_1; } }
	if(!mixed) return [0, sgn * P, Q];
	var q = Math.floor(sgn * P/Q);
	return [q, sgn*P - q*Q, Q];
}
function SSF_normalize_xl_unsafe(v/*:number*/)/*:number*/ {
	var s = v.toPrecision(16);
	if(s.indexOf("e") > -1) {
		var m = s.slice(0, s.indexOf("e"));
		m = m.indexOf(".") > -1 ? m.slice(0, (m.slice(0,2) == "0." ? 17 : 16)) : (m.slice(0,15) + fill("0", m.length - 15));
		return m + s.slice(s.indexOf("e"));
	}
	var n = s.indexOf(".") > -1 ? s.slice(0, (s.slice(0,2) == "0." ? 17 : 16)) : (s.slice(0,15) + fill("0", s.length - 15));
	return Number(n);
}

function SSF_parse_date_code(v/*:number*/,opts/*:?any*/,b2/*:?boolean*/) {
	if(v > 2958465 || v < 0) return null;
	v = SSF_normalize_xl_unsafe(v);
	var date = (v|0), time = Math.floor(86400 * (v - date)), dow=0;
	var dout=[];
	var out={D:date, T:time, u:86400*(v-date)-time,y:0,m:0,d:0,H:0,M:0,S:0,q:0};
	if(Math.abs(out.u) < 1e-6) out.u = 0;
	if(opts && opts.date1904) date += 1462;
	if(out.u > 0.9999) {
		out.u = 0;
		if(++time == 86400) { out.T = time = 0; ++date; ++out.D; }
	}
	if(date === 60) {dout = b2 ? [1317,10,29] : [1900,2,29]; dow=3;}
	else if(date === 0) {dout = b2 ? [1317,8,29] : [1900,1,0]; dow=6;}
	else {
		if(date > 60) --date;
		/* 1 = Jan 1 1900 in Gregorian */
		var d = new Date(1900, 0, 1);
		d.setDate(d.getDate() + date - 1);
		dout = [d.getFullYear(), d.getMonth()+1,d.getDate()];
		dow = d.getDay();
		if(date < 60) dow = (dow + 6) % 7;
		if(b2) dow = SSF_fix_hijri(d, dout);
	}
	out.y = dout[0]; out.m = dout[1]; out.d = dout[2];
	out.S = time % 60; time = Math.floor(time / 60);
	out.M = time % 60; time = Math.floor(time / 60);
	out.H = time;
	out.q = dow;
	return out;
}
/* ECMA-376 18.8.30 numFmt*/
/* Note: `toPrecision` uses standard form when prec > E and E >= -6 */
/* exponent >= -9 and <= 9 */
function SSF_strip_decimal(o/*:string*/)/*:string*/ {
	return (o.indexOf(".") == -1) ? o : o.replace(/(?:\.0*|(\.\d*[1-9])0+)$/, "$1");
}

/* General Exponential always shows 2 digits exp and trims the mantissa */
function SSF_normalize_exp(o/*:string*/)/*:string*/ {
	if(o.indexOf("E") == -1) return o;
	return o.replace(/(?:\.0*|(\.\d*[1-9])0+)[Ee]/,"$1E").replace(/(E[+-])(\d)$/,"$10$2");
}

/* exponent >= -9 and <= 9 */
function SSF_small_exp(v/*:number*/)/*:string*/ {
	var w = (v<0?12:11);
	var o = SSF_strip_decimal(v.toFixed(12)); if(o.length <= w) return o;
	o = v.toPrecision(10); if(o.length <= w) return o;
	return v.toExponential(5);
}

/* exponent >= 11 or <= -10 likely exponential */
function SSF_large_exp(v/*:number*/)/*:string*/ {
	var o = SSF_strip_decimal(v.toFixed(11));
	return (o.length > (v<0?12:11) || o === "0" || o === "-0") ? v.toPrecision(6) : o;
}

function SSF_general_num(v/*:number*/)/*:string*/ {
	var V = Math.floor(Math.log(Math.abs(v))*Math.LOG10E), o;

	if(V >= -4 && V <= -1) o = v.toPrecision(10+V);
	else if(Math.abs(V) <= 9) o = SSF_small_exp(v);
	else if(V === 10) o = v.toFixed(10).substr(0,12);
	else o = SSF_large_exp(v);

	return SSF_strip_decimal(SSF_normalize_exp(o.toUpperCase()));
}


/*
	"General" rules:
	- text is passed through ("@")
	- booleans are rendered as TRUE/FALSE
	- "up to 11 characters" displayed for numbers
	- Default date format (code 14) used for Dates

	The longest 32-bit integer text is "-2147483648", exactly 11 chars
	TODO: technically the display depends on the width of the cell
*/
function SSF_general(v/*:any*/, opts/*:any*/) {
	switch(typeof v) {
		case 'string': return v;
		case 'boolean': return v ? "TRUE" : "FALSE";
		case 'number': return (v|0) === v ? v.toString(10) : SSF_general_num(v);
		case 'undefined': return "";
		case 'object':
			if(v == null) return "";
			if(v instanceof Date) return SSF_format(14, datenum(v, opts && opts.date1904), opts);
	}
	throw new Error("unsupported value in General format: " + v);
}

function SSF_fix_hijri(date/*:Date*/, o/*:[number, number, number]*/) {
  /* TODO: properly adjust y/m/d and  */
  o[0] -= 581;
  var dow = date.getDay();
  if(date < 60) dow = (dow + 6) % 7;
  return dow;
}
//var THAI_DIGITS = "\u0E50\u0E51\u0E52\u0E53\u0E54\u0E55\u0E56\u0E57\u0E58\u0E59".split("");
function SSF_write_date(type/*:number*/, fmt/*:string*/, val, ss0/*:?number*/)/*:string*/ {
	var o="", ss=0, tt=0, y = val.y, out, outl = 0;
	switch(type) {
		case 98: /* 'b' buddhist year */
			y = val.y + 543;
			/* falls through */
		case 121: /* 'y' year */
		switch(fmt.length) {
			case 1: case 2: out = y % 100; outl = 2; break;
			default: out = y % 10000; outl = 4; break;
		} break;
		case 109: /* 'm' month */
		switch(fmt.length) {
			case 1: case 2: out = val.m; outl = fmt.length; break;
			case 3: return months[val.m-1][1];
			case 5: return months[val.m-1][0];
			default: return months[val.m-1][2];
		} break;
		case 100: /* 'd' day */
		switch(fmt.length) {
			case 1: case 2: out = val.d; outl = fmt.length; break;
			case 3: return days[val.q][0];
			default: return days[val.q][1];
		} break;
		case 104: /* 'h' 12-hour */
		switch(fmt.length) {
			case 1: case 2: out = 1+(val.H+11)%12; outl = fmt.length; break;
			default: throw 'bad hour format: ' + fmt;
		} break;
		case 72: /* 'H' 24-hour */
		switch(fmt.length) {
			case 1: case 2: out = val.H; outl = fmt.length; break;
			default: throw 'bad hour format: ' + fmt;
		} break;
		case 77: /* 'M' minutes */
		switch(fmt.length) {
			case 1: case 2: out = val.M; outl = fmt.length; break;
			default: throw 'bad minute format: ' + fmt;
		} break;
		case 115: /* 's' seconds */
			if(fmt != 's' && fmt != 'ss' && fmt != '.0' && fmt != '.00' && fmt != '.000') throw 'bad second format: ' + fmt;
			if(val.u === 0 && (fmt == "s" || fmt == "ss")) return pad0(val.S, fmt.length);
			/*::if(!ss0) ss0 = 0; */
			if(ss0 >= 2) tt = ss0 === 3 ? 1000 : 100;
			else tt = ss0 === 1 ? 10 : 1;
			ss = Math.round((tt)*(val.S + val.u));
			if(ss >= 60*tt) ss = 0;
			if(fmt === 's') return ss === 0 ? "0" : ""+ss/tt;
			o = pad0(ss,2 + ss0);
			if(fmt === 'ss') return o.substr(0,2);
			return "." + o.substr(2,fmt.length-1);
		case 90: /* 'Z' absolute time */
		switch(fmt) {
			case '[h]': case '[hh]': out = val.D*24+val.H; break;
			case '[m]': case '[mm]': out = (val.D*24+val.H)*60+val.M; break;
			case '[s]': case '[ss]': out = ((val.D*24+val.H)*60+val.M)*60+(ss0 == 0 ? Math.round(val.S+val.u) : val.S); break;
			default: throw 'bad abstime format: ' + fmt;
		} outl = fmt.length === 3 ? 1 : 2; break;
		case 101: /* 'e' era */
			out = y; outl = 1; break;
	}
	var outstr = outl > 0 ? pad0(out, outl) : "";
	return outstr;
}


/*jshint -W086 */
/*jshint +W086 */
function commaify(s/*:string*/)/*:string*/ {
	var w = 3;
	if(s.length <= w) return s;
	var j = (s.length % w), o = s.substr(0,j);
	for(; j!=s.length; j+=w) o+=(o.length > 0 ? "," : "") + s.substr(j,w);
	return o;
}
var pct1 = /%/g;
function write_num_pct(type/*:string*/, fmt/*:string*/, val/*:number*/)/*:string*/{
	var sfmt = fmt.replace(pct1,""), mul = fmt.length - sfmt.length;
	return write_num(type, sfmt, val * Math.pow(10,2*mul)) + fill("%",mul);
}

function write_num_cm(type/*:string*/, fmt/*:string*/, val/*:number*/)/*:string*/{
	var idx = fmt.length - 1;
	while(fmt.charCodeAt(idx-1) === 44) --idx;
	return write_num(type, fmt.substr(0,idx), val / Math.pow(10,3*(fmt.length-idx)));
}

function write_num_exp(fmt/*:string*/, val/*:number*/)/*:string*/{
	var o/*:string*/;
	var idx = fmt.indexOf("E") - fmt.indexOf(".") - 1;
	if(fmt.match(/^#+0.0E\+0$/)) {
		if(val == 0) return "0.0E+0";
		else if(val < 0) return "-" + write_num_exp(fmt, -val);
		var period = fmt.indexOf("."); if(period === -1) period=fmt.indexOf('E');
		var ee = Math.floor(Math.log(val)*Math.LOG10E)%period;
		if(ee < 0) ee += period;
		o = (val/Math.pow(10,ee)).toPrecision(idx+1+(period+ee)%period);
		if(o.indexOf("e") === -1) {
			var fakee = Math.floor(Math.log(val)*Math.LOG10E);
			if(o.indexOf(".") === -1) o = o.charAt(0) + "." + o.substr(1) + "E+" + (fakee - o.length+ee);
			else o += "E+" + (fakee - ee);
			while(o.substr(0,2) === "0.") {
				o = o.charAt(0) + o.substr(2,period) + "." + o.substr(2+period);
				o = o.replace(/^0+([1-9])/,"$1").replace(/^0+\./,"0.");
			}
			o = o.replace(/\+-/,"-");
		}
		o = o.replace(/^([+-]?)(\d*)\.(\d*)[Ee]/,function($$,$1,$2,$3) { return $1 + $2 + $3.substr(0,(period+ee)%period) + "." + $3.substr(ee) + "E"; });
	} else o = val.toExponential(idx);
	if(fmt.match(/E\+00$/) && o.match(/e[+-]\d$/)) o = o.substr(0,o.length-1) + "0" + o.charAt(o.length-1);
	if(fmt.match(/E\-/) && o.match(/e\+/)) o = o.replace(/e\+/,"e");
	return o.replace("e","E");
}
var frac1 = /# (\?+)( ?)\/( ?)(\d+)/;
function write_num_f1(r/*:Array<string>*/, aval/*:number*/, sign/*:string*/)/*:string*/ {
	var den = parseInt(r[4],10), rr = Math.round(aval * den), base = Math.floor(rr/den);
	var myn = (rr - base*den), myd = den;
	return sign + (base === 0 ? "" : ""+base) + " " + (myn === 0 ? fill(" ", r[1].length + 1 + r[4].length) : pad_(myn,r[1].length) + r[2] + "/" + r[3] + pad0(myd,r[4].length));
}
function write_num_f2(r/*:Array<string>*/, aval/*:number*/, sign/*:string*/)/*:string*/ {
	return sign + (aval === 0 ? "" : ""+aval) + fill(" ", r[1].length + 2 + r[4].length);
}
var dec1 = /^#*0*\.([0#]+)/;
var closeparen = /\)[^)]*[0#]/;
var phone = /\(###\) ###\\?-####/;
function hashq(str/*:string*/)/*:string*/ {
	var o = "", cc;
	for(var i = 0; i != str.length; ++i) switch((cc=str.charCodeAt(i))) {
		case 35: break;
		case 63: o+= " "; break;
		case 48: o+= "0"; break;
		default: o+= String.fromCharCode(cc);
	}
	return o;
}
function rnd(val/*:number*/, d/*:number*/)/*:string*/ { var dd = Math.pow(10,d); return ""+(Math.round(val * dd)/dd); }
function dec(val/*:number*/, d/*:number*/)/*:number*/ {
	var _frac = val - Math.floor(val), dd = Math.pow(10,d);
	if (d < ('' + Math.round(_frac * dd)).length) return 0;
	return Math.round(_frac * dd);
}
function carry(val/*:number*/, d/*:number*/)/*:number*/ {
	if (d < ('' + Math.round((val-Math.floor(val))*Math.pow(10,d))).length) {
		return 1;
	}
	return 0;
}
function flr(val/*:number*/)/*:string*/ {
	if(val < 2147483647 && val > -2147483648) return ""+(val >= 0 ? (val|0) : (val-1|0));
	return ""+Math.floor(val);
}
function write_num_flt(type/*:string*/, fmt/*:string*/, val/*:number*/)/*:string*/ {
	if(type.charCodeAt(0) === 40 && !fmt.match(closeparen)) {
		var ffmt = fmt.replace(/\( */,"").replace(/ \)/,"").replace(/\)/,"");
		if(val >= 0) return write_num_flt('n', ffmt, val);
		return '(' + write_num_flt('n', ffmt, -val) + ')';
	}
	if(fmt.charCodeAt(fmt.length - 1) === 44) return write_num_cm(type, fmt, val);
	if(fmt.indexOf('%') !== -1) return write_num_pct(type, fmt, val);
	if(fmt.indexOf('E') !== -1) return write_num_exp(fmt, val);
	if(fmt.charCodeAt(0) === 36) return "$"+write_num_flt(type,fmt.substr(fmt.charAt(1)==' '?2:1),val);
	var o;
	var r/*:?Array<string>*/, ri, ff, aval = Math.abs(val), sign = val < 0 ? "-" : "";
	if(fmt.match(/^00+$/)) return sign + pad0r(aval,fmt.length);
	if(fmt.match(/^[#?]+$/)) {
		o = pad0r(val,0); if(o === "0") o = "";
		return o.length > fmt.length ? o : hashq(fmt.substr(0,fmt.length-o.length)) + o;
	}
	if((r = fmt.match(frac1))) return write_num_f1(r, aval, sign);
	if(fmt.match(/^#+0+$/)) return sign + pad0r(aval,fmt.length - fmt.indexOf("0"));
	if((r = fmt.match(dec1))) {
		o = rnd(val, r[1].length).replace(/^([^\.]+)$/,"$1."+hashq(r[1])).replace(/\.$/,"."+hashq(r[1])).replace(/\.(\d*)$/,function($$, $1) { return "." + $1 + fill("0", hashq(/*::(*/r/*::||[""])*/[1]).length-$1.length); });
		return fmt.indexOf("0.") !== -1 ? o : o.replace(/^0\./,".");
	}
	fmt = fmt.replace(/^#+([0.])/, "$1");
	if((r = fmt.match(/^(0*)\.(#*)$/))) {
		return sign + rnd(aval, r[2].length).replace(/\.(\d*[1-9])0*$/,".$1").replace(/^(-?\d*)$/,"$1.").replace(/^0\./,r[1].length?"0.":".");
	}
	if((r = fmt.match(/^#{1,3},##0(\.?)$/))) return sign + commaify(pad0r(aval,0));
	if((r = fmt.match(/^#,##0\.([#0]*0)$/))) {
		return val < 0 ? "-" + write_num_flt(type, fmt, -val) : commaify(""+(Math.floor(val) + carry(val, r[1].length))) + "." + pad0(dec(val, r[1].length),r[1].length);
	}
	if((r = fmt.match(/^#,#*,#0/))) return write_num_flt(type,fmt.replace(/^#,#*,/,""),val);
	if((r = fmt.match(/^([0#]+)(\\?-([0#]+))+$/))) {
		o = _strrev(write_num_flt(type, fmt.replace(/[\\-]/g,""), val));
		ri = 0;
		return _strrev(_strrev(fmt.replace(/\\/g,"")).replace(/[0#]/g,function(x){return ri<o.length?o.charAt(ri++):x==='0'?'0':"";}));
	}
	if(fmt.match(phone)) {
		o = write_num_flt(type, "##########", val);
		return "(" + o.substr(0,3) + ") " + o.substr(3, 3) + "-" + o.substr(6);
	}
	var oa = "";
	if((r = fmt.match(/^([#0?]+)( ?)\/( ?)([#0?]+)/))) {
		ri = Math.min(/*::String(*/r[4]/*::)*/.length,7);
		ff = SSF_frac(aval, Math.pow(10,ri)-1, false);
		o = "" + sign;
		oa = write_num("n", /*::String(*/r[1]/*::)*/, ff[1]);
		if(oa.charAt(oa.length-1) == " ") oa = oa.substr(0,oa.length-1) + "0";
		o += oa + /*::String(*/r[2]/*::)*/ + "/" + /*::String(*/r[3]/*::)*/;
		oa = rpad_(ff[2],ri);
		if(oa.length < r[4].length) oa = hashq(r[4].substr(r[4].length-oa.length)) + oa;
		o += oa;
		return o;
	}
	if((r = fmt.match(/^# ([#0?]+)( ?)\/( ?)([#0?]+)/))) {
		ri = Math.min(Math.max(r[1].length, r[4].length),7);
		ff = SSF_frac(aval, Math.pow(10,ri)-1, true);
		return sign + (ff[0]||(ff[1] ? "" : "0")) + " " + (ff[1] ? pad_(ff[1],ri) + r[2] + "/" + r[3] + rpad_(ff[2],ri): fill(" ", 2*ri+1 + r[2].length + r[3].length));
	}
	if((r = fmt.match(/^[#0?]+$/))) {
		o = pad0r(val, 0);
		if(fmt.length <= o.length) return o;
		return hashq(fmt.substr(0,fmt.length-o.length)) + o;
	}
	if((r = fmt.match(/^([#0?]+)\.([#0]+)$/))) {
		o = "" + val.toFixed(Math.min(r[2].length,10)).replace(/([^0])0+$/,"$1");
		ri = o.indexOf(".");
		var lres = fmt.indexOf(".") - ri, rres = fmt.length - o.length - lres;
		return hashq(fmt.substr(0,lres) + o + fmt.substr(fmt.length-rres));
	}
	if((r = fmt.match(/^00,000\.([#0]*0)$/))) {
		ri = dec(val, r[1].length);
		return val < 0 ? "-" + write_num_flt(type, fmt, -val) : commaify(flr(val)).replace(/^\d,\d{3}$/,"0$&").replace(/^\d*$/,function($$) { return "00," + ($$.length < 3 ? pad0(0,3-$$.length) : "") + $$; }) + "." + pad0(ri,r[1].length);
	}
	switch(fmt) {
		case "###,##0.00": return write_num_flt(type, "#,##0.00", val);
		case "###,###":
		case "##,###":
		case "#,###": var x = commaify(pad0r(aval,0)); return x !== "0" ? sign + x : "";
		case "###,###.00": return write_num_flt(type, "###,##0.00",val).replace(/^0\./,".");
		case "#,###.00": return write_num_flt(type, "#,##0.00",val).replace(/^0\./,".");
		default:
	}
	throw new Error("unsupported format |" + fmt + "|");
}
function write_num_cm2(type/*:string*/, fmt/*:string*/, val/*:number*/)/*:string*/{
	var idx = fmt.length - 1;
	while(fmt.charCodeAt(idx-1) === 44) --idx;
	return write_num(type, fmt.substr(0,idx), val / Math.pow(10,3*(fmt.length-idx)));
}
function write_num_pct2(type/*:string*/, fmt/*:string*/, val/*:number*/)/*:string*/{
	var sfmt = fmt.replace(pct1,""), mul = fmt.length - sfmt.length;
	return write_num(type, sfmt, val * Math.pow(10,2*mul)) + fill("%",mul);
}
function write_num_exp2(fmt/*:string*/, val/*:number*/)/*:string*/{
	var o/*:string*/;
	var idx = fmt.indexOf("E") - fmt.indexOf(".") - 1;
	if(fmt.match(/^#+0.0E\+0$/)) {
		if(val == 0) return "0.0E+0";
		else if(val < 0) return "-" + write_num_exp2(fmt, -val);
		var period = fmt.indexOf("."); if(period === -1) period=fmt.indexOf('E');
		var ee = Math.floor(Math.log(val)*Math.LOG10E)%period;
		if(ee < 0) ee += period;
		o = (val/Math.pow(10,ee)).toPrecision(idx+1+(period+ee)%period);
		if(!o.match(/[Ee]/)) {
			var fakee = Math.floor(Math.log(val)*Math.LOG10E);
			if(o.indexOf(".") === -1) o = o.charAt(0) + "." + o.substr(1) + "E+" + (fakee - o.length+ee);
			else o += "E+" + (fakee - ee);
			o = o.replace(/\+-/,"-");
		}
		o = o.replace(/^([+-]?)(\d*)\.(\d*)[Ee]/,function($$,$1,$2,$3) { return $1 + $2 + $3.substr(0,(period+ee)%period) + "." + $3.substr(ee) + "E"; });
	} else o = val.toExponential(idx);
	if(fmt.match(/E\+00$/) && o.match(/e[+-]\d$/)) o = o.substr(0,o.length-1) + "0" + o.charAt(o.length-1);
	if(fmt.match(/E\-/) && o.match(/e\+/)) o = o.replace(/e\+/,"e");
	return o.replace("e","E");
}
function write_num_int(type/*:string*/, fmt/*:string*/, val/*:number*/)/*:string*/ {
	if(type.charCodeAt(0) === 40 && !fmt.match(closeparen)) {
		var ffmt = fmt.replace(/\( */,"").replace(/ \)/,"").replace(/\)/,"");
		if(val >= 0) return write_num_int('n', ffmt, val);
		return '(' + write_num_int('n', ffmt, -val) + ')';
	}
	if(fmt.charCodeAt(fmt.length - 1) === 44) return write_num_cm2(type, fmt, val);
	if(fmt.indexOf('%') !== -1) return write_num_pct2(type, fmt, val);
	if(fmt.indexOf('E') !== -1) return write_num_exp2(fmt, val);
	if(fmt.charCodeAt(0) === 36) return "$"+write_num_int(type,fmt.substr(fmt.charAt(1)==' '?2:1),val);
	var o;
	var r/*:?Array<string>*/, ri, ff, aval = Math.abs(val), sign = val < 0 ? "-" : "";
	if(fmt.match(/^00+$/)) return sign + pad0(aval,fmt.length);
	if(fmt.match(/^[#?]+$/)) {
		o = (""+val); if(val === 0) o = "";
		return o.length > fmt.length ? o : hashq(fmt.substr(0,fmt.length-o.length)) + o;
	}
	if((r = fmt.match(frac1))) return write_num_f2(r, aval, sign);
	if(fmt.match(/^#+0+$/)) return sign + pad0(aval,fmt.length - fmt.indexOf("0"));
	if((r = fmt.match(dec1))) {
		/*:: if(!Array.isArray(r)) throw new Error("unreachable"); */
		o = (""+val).replace(/^([^\.]+)$/,"$1."+hashq(r[1])).replace(/\.$/,"."+hashq(r[1]));
		o = o.replace(/\.(\d*)$/,function($$, $1) {
		/*:: if(!Array.isArray(r)) throw new Error("unreachable"); */
			return "." + $1 + fill("0", hashq(r[1]).length-$1.length); });
		return fmt.indexOf("0.") !== -1 ? o : o.replace(/^0\./,".");
	}
	fmt = fmt.replace(/^#+([0.])/, "$1");
	if((r = fmt.match(/^(0*)\.(#*)$/))) {
		return sign + (""+aval).replace(/\.(\d*[1-9])0*$/,".$1").replace(/^(-?\d*)$/,"$1.").replace(/^0\./,r[1].length?"0.":".");
	}
	if((r = fmt.match(/^#{1,3},##0(\.?)$/))) return sign + commaify((""+aval));
	if((r = fmt.match(/^#,##0\.([#0]*0)$/))) {
		return val < 0 ? "-" + write_num_int(type, fmt, -val) : commaify((""+val)) + "." + fill('0',r[1].length);
	}
	if((r = fmt.match(/^#,#*,#0/))) return write_num_int(type,fmt.replace(/^#,#*,/,""),val);
	if((r = fmt.match(/^([0#]+)(\\?-([0#]+))+$/))) {
		o = _strrev(write_num_int(type, fmt.replace(/[\\-]/g,""), val));
		ri = 0;
		return _strrev(_strrev(fmt.replace(/\\/g,"")).replace(/[0#]/g,function(x){return ri<o.length?o.charAt(ri++):x==='0'?'0':"";}));
	}
	if(fmt.match(phone)) {
		o = write_num_int(type, "##########", val);
		return "(" + o.substr(0,3) + ") " + o.substr(3, 3) + "-" + o.substr(6);
	}
	var oa = "";
	if((r = fmt.match(/^([#0?]+)( ?)\/( ?)([#0?]+)/))) {
		ri = Math.min(/*::String(*/r[4]/*::)*/.length,7);
		ff = SSF_frac(aval, Math.pow(10,ri)-1, false);
		o = "" + sign;
		oa = write_num("n", /*::String(*/r[1]/*::)*/, ff[1]);
		if(oa.charAt(oa.length-1) == " ") oa = oa.substr(0,oa.length-1) + "0";
		o += oa + /*::String(*/r[2]/*::)*/ + "/" + /*::String(*/r[3]/*::)*/;
		oa = rpad_(ff[2],ri);
		if(oa.length < r[4].length) oa = hashq(r[4].substr(r[4].length-oa.length)) + oa;
		o += oa;
		return o;
	}
	if((r = fmt.match(/^# ([#0?]+)( ?)\/( ?)([#0?]+)/))) {
		ri = Math.min(Math.max(r[1].length, r[4].length),7);
		ff = SSF_frac(aval, Math.pow(10,ri)-1, true);
		return sign + (ff[0]||(ff[1] ? "" : "0")) + " " + (ff[1] ? pad_(ff[1],ri) + r[2] + "/" + r[3] + rpad_(ff[2],ri): fill(" ", 2*ri+1 + r[2].length + r[3].length));
	}
	if((r = fmt.match(/^[#0?]+$/))) {
		o = "" + val;
		if(fmt.length <= o.length) return o;
		return hashq(fmt.substr(0,fmt.length-o.length)) + o;
	}
	if((r = fmt.match(/^([#0]+)\.([#0]+)$/))) {
		o = "" + val.toFixed(Math.min(r[2].length,10)).replace(/([^0])0+$/,"$1");
		ri = o.indexOf(".");
		var lres = fmt.indexOf(".") - ri, rres = fmt.length - o.length - lres;
		return hashq(fmt.substr(0,lres) + o + fmt.substr(fmt.length-rres));
	}
	if((r = fmt.match(/^00,000\.([#0]*0)$/))) {
		return val < 0 ? "-" + write_num_int(type, fmt, -val) : commaify(""+val).replace(/^\d,\d{3}$/,"0$&").replace(/^\d*$/,function($$) { return "00," + ($$.length < 3 ? pad0(0,3-$$.length) : "") + $$; }) + "." + pad0(0,r[1].length);
	}
	switch(fmt) {
		case "###,###":
		case "##,###":
		case "#,###": var x = commaify(""+aval); return x !== "0" ? sign + x : "";
		default:
			if(fmt.match(/\.[0#?]*$/)) return write_num_int(type, fmt.slice(0,fmt.lastIndexOf(".")), val) + hashq(fmt.slice(fmt.lastIndexOf(".")));
	}
	throw new Error("unsupported format |" + fmt + "|");
}
function write_num(type/*:string*/, fmt/*:string*/, val/*:number*/)/*:string*/ {
	return (val|0) === val ? write_num_int(type, fmt, val) : write_num_flt(type, fmt, val);
}
function SSF_split_fmt(fmt/*:string*/)/*:Array<string>*/ {
	var out/*:Array<string>*/ = [];
	var in_str = false/*, cc*/;
	for(var i = 0, j = 0; i < fmt.length; ++i) switch((/*cc=*/fmt.charCodeAt(i))) {
		case 34: /* '"' */
			in_str = !in_str; break;
		case 95: case 42: case 92: /* '_' '*' '\\' */
			++i; break;
		case 59: /* ';' */
			out[out.length] = fmt.substr(j,i-j);
			j = i+1;
	}
	out[out.length] = fmt.substr(j);
	if(in_str === true) throw new Error("Format |" + fmt + "| unterminated string ");
	return out;
}

var SSF_abstime = /\[[HhMmSs\u0E0A\u0E19\u0E17]*\]/;
function fmt_is_date(fmt/*:string*/)/*:boolean*/ {
	var i = 0, /*cc = 0,*/ c = "", o = "";
	while(i < fmt.length) {
		switch((c = fmt.charAt(i))) {
			case 'G': if(SSF_isgeneral(fmt, i)) i+= 6; i++; break;
			case '"': for(;(/*cc=*/fmt.charCodeAt(++i)) !== 34 && i < fmt.length;){/*empty*/} ++i; break;
			case '\\': i+=2; break;
			case '_': i+=2; break;
			case '@': ++i; break;
			case 'B': case 'b':
				if(fmt.charAt(i+1) === "1" || fmt.charAt(i+1) === "2") return true;
				/* falls through */
			case 'M': case 'D': case 'Y': case 'H': case 'S': case 'E':
				/* falls through */
			case 'm': case 'd': case 'y': case 'h': case 's': case 'e': case 'g': return true;
			case 'A': case 'a': case '上':
				if(fmt.substr(i, 3).toUpperCase() === "A/P") return true;
				if(fmt.substr(i, 5).toUpperCase() === "AM/PM") return true;
				if(fmt.substr(i, 5).toUpperCase() === "上午/下午") return true;
				++i; break;
			case '[':
				o = c;
				while(fmt.charAt(i++) !== ']' && i < fmt.length) o += fmt.charAt(i);
				if(o.match(SSF_abstime)) return true;
				break;
			case '.':
				/* falls through */
			case '0': case '#':
				while(i < fmt.length && ("0#?.,E+-%".indexOf(c=fmt.charAt(++i)) > -1 || (c=='\\' && fmt.charAt(i+1) == "-" && "0#".indexOf(fmt.charAt(i+2))>-1))){/* empty */}
				break;
			case '?': while(fmt.charAt(++i) === c){/* empty */} break;
			case '*': ++i; if(fmt.charAt(i) == ' ' || fmt.charAt(i) == '*') ++i; break;
			case '(': case ')': ++i; break;
			case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
				while(i < fmt.length && "0123456789".indexOf(fmt.charAt(++i)) > -1){/* empty */} break;
			case ' ': ++i; break;
			default: ++i; break;
		}
	}
	return false;
}

function eval_fmt(fmt/*:string*/, v/*:any*/, opts/*:any*/, flen/*:number*/) {
	var out = [], o = "", i = 0, c = "", lst='t', dt, j, cc;
	var hr='H';
	/* Tokenize */
	while(i < fmt.length) {
		switch((c = fmt.charAt(i))) {
			case 'G': /* General */
				if(!SSF_isgeneral(fmt, i)) throw new Error('unrecognized character ' + c + ' in ' +fmt);
				out[out.length] = {t:'G', v:'General'}; i+=7; break;
			case '"': /* Literal text */
				for(o="";(cc=fmt.charCodeAt(++i)) !== 34 && i < fmt.length;) o += String.fromCharCode(cc);
				out[out.length] = {t:'t', v:o}; ++i; break;
			case '\\': var w = fmt.charAt(++i), t = (w === "(" || w === ")") ? w : 't';
				out[out.length] = {t:t, v:w}; ++i; break;
			case '_': out[out.length] = {t:'t', v:" "}; i+=2; break;
			case '@': /* Text Placeholder */
				out[out.length] = {t:'T', v:v}; ++i; break;
			case 'B': case 'b':
				if(fmt.charAt(i+1) === "1" || fmt.charAt(i+1) === "2") {
					if(dt==null) { dt=SSF_parse_date_code(v, opts, fmt.charAt(i+1) === "2"); if(dt==null) return ""; }
					out[out.length] = {t:'X', v:fmt.substr(i,2)}; lst = c; i+=2; break;
				}
				/* falls through */
			case 'M': case 'D': case 'Y': case 'H': case 'S': case 'E':
				c = c.toLowerCase();
				/* falls through */
			case 'm': case 'd': case 'y': case 'h': case 's': case 'e': case 'g':
				if(v < 0) return "";
				if(dt==null) { dt=SSF_parse_date_code(v, opts); if(dt==null) return ""; }
				o = c; while(++i < fmt.length && fmt.charAt(i).toLowerCase() === c) o+=c;
				if(c === 'm' && lst.toLowerCase() === 'h') c = 'M';
				if(c === 'h') c = hr;
				out[out.length] = {t:c, v:o}; lst = c; break;
			case 'A': case 'a': case '上':
				var q={t:c, v:c};
				if(dt==null) dt=SSF_parse_date_code(v, opts);
				if(fmt.substr(i, 3).toUpperCase() === "A/P") { if(dt!=null) q.v = dt.H >= 12 ? fmt.charAt(i+2) : c; q.t = 'T'; hr='h';i+=3;}
				else if(fmt.substr(i,5).toUpperCase() === "AM/PM") { if(dt!=null) q.v = dt.H >= 12 ? "PM" : "AM"; q.t = 'T'; i+=5; hr='h'; }
				else if(fmt.substr(i,5).toUpperCase() === "上午/下午") { if(dt!=null) q.v = dt.H >= 12 ? "下午" : "上午"; q.t = 'T'; i+=5; hr='h'; }
				else { q.t = "t"; ++i; }
				if(dt==null && q.t === 'T') return "";
				out[out.length] = q; lst = c; break;
			case '[':
				o = c;
				while(fmt.charAt(i++) !== ']' && i < fmt.length) o += fmt.charAt(i);
				if(o.slice(-1) !== ']') throw 'unterminated "[" block: |' + o + '|';
				if(o.match(SSF_abstime)) {
					if(dt==null) { dt=SSF_parse_date_code(v, opts); if(dt==null) return ""; }
					out[out.length] = {t:'Z', v:o.toLowerCase()};
					lst = o.charAt(1);
				} else if(o.indexOf("$") > -1) {
					o = (o.match(/\$([^-\[\]]*)/)||[])[1]||"$";
					if(!fmt_is_date(fmt)) out[out.length] = {t:'t',v:o};
				}
				break;
			/* Numbers */
			case '.':
				if(dt != null) {
					o = c; while(++i < fmt.length && (c=fmt.charAt(i)) === "0") o += c;
					out[out.length] = {t:'s', v:o}; break;
				}
				/* falls through */
			case '0': case '#':
				o = c; while(++i < fmt.length && "0#?.,E+-%".indexOf(c=fmt.charAt(i)) > -1) o += c;
				out[out.length] = {t:'n', v:o}; break;
			case '?':
				o = c; while(fmt.charAt(++i) === c) o+=c;
				out[out.length] = {t:c, v:o}; lst = c; break;
			case '*': ++i; if(fmt.charAt(i) == ' ' || fmt.charAt(i) == '*') ++i; break; // **
			case '(': case ')': out[out.length] = {t:(flen===1?'t':c), v:c}; ++i; break;
			case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9':
				o = c; while(i < fmt.length && "0123456789".indexOf(fmt.charAt(++i)) > -1) o+=fmt.charAt(i);
				out[out.length] = {t:'D', v:o}; break;
			case ' ': out[out.length] = {t:c, v:c}; ++i; break;
			case '$': out[out.length] = {t:'t', v:'$'}; ++i; break;
			default:
				if(",$-+/():!^&'~{}<>=€acfijklopqrtuvwxzP".indexOf(c) === -1) throw new Error('unrecognized character ' + c + ' in ' + fmt);
				out[out.length] = {t:'t', v:c}; ++i; break;
		}
	}

	/* Scan for date/time parts */
	var bt = 0, ss0 = 0, ssm;
	for(i=out.length-1, lst='t'; i >= 0; --i) {
		switch(out[i].t) {
			case 'h': case 'H': out[i].t = hr; lst='h'; if(bt < 1) bt = 1; break;
			case 's':
				if((ssm=out[i].v.match(/\.0+$/))) { ss0=Math.max(ss0,ssm[0].length-1); bt = 4;}
				if(bt < 3) bt = 3;
			/* falls through */
			case 'd': case 'y': case 'e': lst=out[i].t; break;
			case 'M': lst=out[i].t; if(bt < 2) bt = 2; break;
			case 'm': if(lst === 's') { out[i].t = 'M'; if(bt < 2) bt = 2; } break;
			case 'X': /*if(out[i].v === "B2");*/
				break;
			case 'Z':
				if(bt < 1 && out[i].v.match(/[Hh]/)) bt = 1;
				if(bt < 2 && out[i].v.match(/[Mm]/)) bt = 2;
				if(bt < 3 && out[i].v.match(/[Ss]/)) bt = 3;
		}
	}

	/* time rounding depends on presence of minute / second / usec fields */
	var _dt;
	switch(bt) {
		case 0: break;
		case 1:
		case 2:
		case 3:
			if(dt.u >= 0.5) { dt.u = 0; ++dt.S; }
			if(dt.S >=  60) { dt.S = 0; ++dt.M; }
			if(dt.M >=  60) { dt.M = 0; ++dt.H; }
			if(dt.H >=  24) { dt.H = 0; ++dt.D; _dt = SSF_parse_date_code(dt.D); _dt.u = dt.u; _dt.S = dt.S; _dt.M = dt.M; _dt.H = dt.H; dt = _dt; }
			break;
		case 4:
			switch(ss0) {
				case 1: dt.u = Math.round(dt.u * 10)/10; break;
				case 2: dt.u = Math.round(dt.u * 100)/100; break;
				case 3: dt.u = Math.round(dt.u * 1000)/1000; break;
			}
			if(dt.u >=   1) { dt.u = 0; ++dt.S; }
			if(dt.S >=  60) { dt.S = 0; ++dt.M; }
			if(dt.M >=  60) { dt.M = 0; ++dt.H; }
			if(dt.H >=  24) { dt.H = 0; ++dt.D; _dt = SSF_parse_date_code(dt.D); _dt.u = dt.u; _dt.S = dt.S; _dt.M = dt.M; _dt.H = dt.H; dt = _dt; }
			break;
	}

	/* replace fields */
	var nstr = "", jj;
	for(i=0; i < out.length; ++i) {
		switch(out[i].t) {
			case 't': case 'T': case ' ': case 'D': break;
			case 'X': out[i].v = ""; out[i].t = ";"; break;
			case 'd': case 'm': case 'y': case 'h': case 'H': case 'M': case 's': case 'e': case 'b': case 'Z':
				/*::if(!dt) throw "unreachable"; */
				out[i].v = SSF_write_date(out[i].t.charCodeAt(0), out[i].v, dt, ss0);
				out[i].t = 't'; break;
			case 'n': case '?':
				jj = i+1;
				while(out[jj] != null && (
					(c=out[jj].t) === "?" || c === "D" ||
					((c === " " || c === "t") && out[jj+1] != null && (out[jj+1].t === '?' || out[jj+1].t === "t" && out[jj+1].v === '/')) ||
					(out[i].t === '(' && (c === ' ' || c === 'n' || c === ')')) ||
					(c === 't' && (out[jj].v === '/' || out[jj].v === ' ' && out[jj+1] != null && out[jj+1].t == '?'))
				)) {
					out[i].v += out[jj].v;
					out[jj] = {v:"", t:";"}; ++jj;
				}
				nstr += out[i].v;
				i = jj-1; break;
			case 'G': out[i].t = 't'; out[i].v = SSF_general(v,opts); break;
		}
	}
	var vv = "", myv, ostr;
	if(nstr.length > 0) {
		if(nstr.charCodeAt(0) == 40) /* '(' */ {
			myv = (v<0&&nstr.charCodeAt(0) === 45 ? -v : v);
			ostr = write_num('n', nstr, myv);
		} else {
			myv = (v<0 && flen > 1 ? -v : v);
			ostr = write_num('n', nstr, myv);
			if(myv < 0 && out[0] && out[0].t == 't') {
				ostr = ostr.substr(1);
				out[0].v = "-" + out[0].v;
			}
		}
		jj=ostr.length-1;
		var decpt = out.length;
		for(i=0; i < out.length; ++i) if(out[i] != null && out[i].t != 't' && out[i].v.indexOf(".") > -1) { decpt = i; break; }
		var lasti=out.length;
		if(decpt === out.length && ostr.indexOf("E") === -1) {
			for(i=out.length-1; i>= 0;--i) {
				if(out[i] == null || 'n?'.indexOf(out[i].t) === -1) continue;
				if(jj>=out[i].v.length-1) { jj -= out[i].v.length; out[i].v = ostr.substr(jj+1, out[i].v.length); }
				else if(jj < 0) out[i].v = "";
				else { out[i].v = ostr.substr(0, jj+1); jj = -1; }
				out[i].t = 't';
				lasti = i;
			}
			if(jj>=0 && lasti<out.length) out[lasti].v = ostr.substr(0,jj+1) + out[lasti].v;
		}
		else if(decpt !== out.length && ostr.indexOf("E") === -1) {
			jj = ostr.indexOf(".")-1;
			for(i=decpt; i>= 0; --i) {
				if(out[i] == null || 'n?'.indexOf(out[i].t) === -1) continue;
				j=out[i].v.indexOf(".")>-1&&i===decpt?out[i].v.indexOf(".")-1:out[i].v.length-1;
				vv = out[i].v.substr(j+1);
				for(; j>=0; --j) {
					if(jj>=0 && (out[i].v.charAt(j) === "0" || out[i].v.charAt(j) === "#")) vv = ostr.charAt(jj--) + vv;
				}
				out[i].v = vv;
				out[i].t = 't';
				lasti = i;
			}
			if(jj>=0 && lasti<out.length) out[lasti].v = ostr.substr(0,jj+1) + out[lasti].v;
			jj = ostr.indexOf(".")+1;
			for(i=decpt; i<out.length; ++i) {
				if(out[i] == null || ('n?('.indexOf(out[i].t) === -1 && i !== decpt)) continue;
				j=out[i].v.indexOf(".")>-1&&i===decpt?out[i].v.indexOf(".")+1:0;
				vv = out[i].v.substr(0,j);
				for(; j<out[i].v.length; ++j) {
					if(jj<ostr.length) vv += ostr.charAt(jj++);
				}
				out[i].v = vv;
				out[i].t = 't';
				lasti = i;
			}
		}
	}
	for(i=0; i<out.length; ++i) if(out[i] != null && 'n?'.indexOf(out[i].t)>-1) {
		myv = (flen >1 && v < 0 && i>0 && out[i-1].v === "-" ? -v:v);
		out[i].v = write_num(out[i].t, out[i].v, myv);
		out[i].t = 't';
	}
	var retval = "";
	for(i=0; i !== out.length; ++i) if(out[i] != null) retval += out[i].v;
	return retval;
}

var cfregex2 = /\[(=|>[=]?|<[>=]?)(-?\d+(?:\.\d*)?)\]/;
function chkcond(v, rr) {
	if(rr == null) return false;
	var thresh = parseFloat(rr[2]);
	switch(rr[1]) {
		case "=":  if(v == thresh) return true; break;
		case ">":  if(v >  thresh) return true; break;
		case "<":  if(v <  thresh) return true; break;
		case "<>": if(v != thresh) return true; break;
		case ">=": if(v >= thresh) return true; break;
		case "<=": if(v <= thresh) return true; break;
	}
	return false;
}
function choose_fmt(f/*:string*/, v/*:any*/) {
	var fmt = SSF_split_fmt(f);
	var l = fmt.length, lat = fmt[l-1].indexOf("@");
	if(l<4 && lat>-1) --l;
	if(fmt.length > 4) throw new Error("cannot find right format for |" + fmt.join("|") + "|");
	if(typeof v !== "number") return [4, fmt.length === 4 || lat>-1?fmt[fmt.length-1]:"@"];
	switch(fmt.length) {
		case 1: fmt = lat>-1 ? ["General", "General", "General", fmt[0]] : [fmt[0], fmt[0], fmt[0], "@"]; break;
		case 2: fmt = lat>-1 ? [fmt[0], fmt[0], fmt[0], fmt[1]] : [fmt[0], fmt[1], fmt[0], "@"]; break;
		case 3: fmt = lat>-1 ? [fmt[0], fmt[1], fmt[0], fmt[2]] : [fmt[0], fmt[1], fmt[2], "@"]; break;
		case 4: break;
	}
	var ff = v > 0 ? fmt[0] : v < 0 ? fmt[1] : fmt[2];
	if(fmt[0].indexOf("[") === -1 && fmt[1].indexOf("[") === -1) return [l, ff];
	if(fmt[0].match(/\[[=<>]/) != null || fmt[1].match(/\[[=<>]/) != null) {
		var m1 = fmt[0].match(cfregex2);
		var m2 = fmt[1].match(cfregex2);
		return chkcond(v, m1) ? [l, fmt[0]] : chkcond(v, m2) ? [l, fmt[1]] : [l, fmt[m1 != null && m2 != null ? 2 : 1]];
	}
	return [l, ff];
}
function SSF_format(fmt/*:string|number*/,v/*:any*/,o/*:?any*/) {
	if(o == null) o = {};
	var sfmt = "";
	switch(typeof fmt) {
		case "string":
			if(fmt == "m/d/yy" && o.dateNF) sfmt = o.dateNF;
			else sfmt = fmt;
			break;
		case "number":
			if(fmt == 14 && o.dateNF) sfmt = o.dateNF;
			else sfmt = (o.table != null ? (o.table/*:any*/) : table_fmt)[fmt];
			if(sfmt == null) sfmt = (o.table && o.table[SSF_default_map[fmt]]) || table_fmt[SSF_default_map[fmt]];
			if(sfmt == null) sfmt = SSF_default_str[fmt] || "General";
			break;
	}
	if(SSF_isgeneral(sfmt,0)) return SSF_general(v, o);
	if(v instanceof Date) v = datenum(v, o.date1904);
	var f = choose_fmt(sfmt, v);
	if(SSF_isgeneral(f[1])) return SSF_general(v, o);
	if(v === true) v = "TRUE"; else if(v === false) v = "FALSE";
	else if(v === "" || v == null) return "";
	return eval_fmt(f[1], v, o, f[0]);
}
function SSF_load(fmt/*:string*/, idx/*:?number*/)/*:number*/ {
	if(typeof idx != 'number') {
		idx = +idx || -1;
/*::if(typeof idx != 'number') return 0x188; */
		for(var i = 0; i < 0x0188; ++i) {
/*::if(typeof idx != 'number') return 0x188; */
			if(table_fmt[i] == undefined) { if(idx < 0) idx = i; continue; }
			if(table_fmt[i] == fmt) { idx = i; break; }
		}
/*::if(typeof idx != 'number') return 0x188; */
		if(idx < 0) idx = 0x187;
	}
/*::if(typeof idx != 'number') return 0x188; */
	table_fmt[idx] = fmt;
	return idx;
}
function SSF_load_table(tbl/*:SSFTable*/)/*:void*/ {
	for(var i=0; i!=0x0188; ++i)
		if(tbl[i] !== undefined) SSF_load(tbl[i], i);
}

function make_ssf() {
	table_fmt = SSF_init_table();
}

var SSF = {
	format: SSF_format,
	load: SSF_load,
	_table: table_fmt,
	load_table: SSF_load_table,
	parse_date_code: SSF_parse_date_code,
	is_date: fmt_is_date,
	get_table: function get_table() { return SSF._table = table_fmt; }
};

var SSFImplicit/*{[number]:string}*/ = ({
	"5": '"$"#,##0_);\\("$"#,##0\\)',
	"6": '"$"#,##0_);[Red]\\("$"#,##0\\)',
	"7": '"$"#,##0.00_);\\("$"#,##0.00\\)',
	"8": '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)',
	"23": 'General', "24": 'General', "25": 'General', "26": 'General',
	"27": 'm/d/yy', "28": 'm/d/yy', "29": 'm/d/yy', "30": 'm/d/yy', "31": 'm/d/yy',
	"32": 'h:mm:ss', "33": 'h:mm:ss', "34": 'h:mm:ss', "35": 'h:mm:ss',
	"36": 'm/d/yy',
	"41": '_(* #,##0_);_(* \(#,##0\);_(* "-"_);_(@_)',
	"42": '_("$"* #,##0_);_("$"* \(#,##0\);_("$"* "-"_);_(@_)',
	"43": '_(* #,##0.00_);_(* \(#,##0.00\);_(* "-"??_);_(@_)',
	"44": '_("$"* #,##0.00_);_("$"* \(#,##0.00\);_("$"* "-"??_);_(@_)',
	"50": 'm/d/yy', "51": 'm/d/yy', "52": 'm/d/yy', "53": 'm/d/yy', "54": 'm/d/yy',
	"55": 'm/d/yy', "56": 'm/d/yy', "57": 'm/d/yy', "58": 'm/d/yy',
	"59": '0',
	"60": '0.00',
	"61": '#,##0',
	"62": '#,##0.00',
	"63": '"$"#,##0_);\\("$"#,##0\\)',
	"64": '"$"#,##0_);[Red]\\("$"#,##0\\)',
	"65": '"$"#,##0.00_);\\("$"#,##0.00\\)',
	"66": '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)',
	"67": '0%',
	"68": '0.00%',
	"69": '# ?/?',
	"70": '# ??/??',
	"71": 'm/d/yy',
	"72": 'm/d/yy',
	"73": 'd-mmm-yy',
	"74": 'd-mmm',
	"75": 'mmm-yy',
	"76": 'h:mm',
	"77": 'h:mm:ss',
	"78": 'm/d/yy h:mm',
	"79": 'mm:ss',
	"80": '[h]:mm:ss',
	"81": 'mmss.0'
}/*:any*/);

/* dateNF parse TODO: move to SSF */
var dateNFregex = /[dD]+|[mM]+|[yYeE]+|[Hh]+|[Ss]+/g;
function dateNF_regex(dateNF/*:string|number*/)/*:RegExp*/ {
	var fmt = typeof dateNF == "number" ? table_fmt[dateNF] : dateNF;
	fmt = fmt.replace(dateNFregex, "(\\d+)");
	dateNFregex.lastIndex = 0;
	return new RegExp("^" + fmt + "$");
}
function dateNF_fix(str/*:string*/, dateNF/*:string*/, match/*:Array<string>*/)/*:string*/ {
	var Y = -1, m = -1, d = -1, H = -1, M = -1, S = -1;
	(dateNF.match(dateNFregex)||[]).forEach(function(n, i) {
		var v = parseInt(match[i+1], 10);
		switch(n.toLowerCase().charAt(0)) {
			case 'y': Y = v; break; case 'd': d = v; break;
			case 'h': H = v; break; case 's': S = v; break;
			case 'm': if(H >= 0) M = v; else m = v; break;
		}
	});
	dateNFregex.lastIndex = 0;
	if(S >= 0 && M == -1 && m >= 0) { M = m; m = -1; }
	var datestr = (("" + (Y>=0?Y: new Date().getFullYear())).slice(-4) + "-" + ("00" + (m>=1?m:1)).slice(-2) + "-" + ("00" + (d>=1?d:1)).slice(-2));
	if(datestr.length == 7) datestr = "0" + datestr;
	if(datestr.length == 8) datestr = "20" + datestr;
	var timestr = (("00" + (H>=0?H:0)).slice(-2) + ":" + ("00" + (M>=0?M:0)).slice(-2) + ":" + ("00" + (S>=0?S:0)).slice(-2));
	if(H == -1 && M == -1 && S == -1) return datestr;
	if(Y == -1 && m == -1 && d == -1) return timestr;
	return datestr + "T" + timestr;
}

/* table of bad formats written by third-party tools */
var bad_formats = {
	"d.m": "d\\.m" // Issue #2571 Google Sheets writes invalid format 'd.m', correct format is 'd"."m' or 'd\\.m'
};

function SSF__load(fmt, idx) {
	return SSF_load(bad_formats[fmt] || fmt, idx);
}

/*::
declare var ReadShift:any;
declare var CheckField:any;
declare var prep_blob:any;
declare var __readUInt32LE:any;
declare var __readInt32LE:any;
declare var __toBuffer:any;
declare var __utf16le:any;
declare var bconcat:any;
declare var s2a:any;
declare var chr0:any;
declare var chr1:any;
declare var has_buf:boolean;
declare var new_buf:any;
declare var new_raw_buf:any;
declare var new_unsafe_buf:any;
declare var Buffer_from:any;
*/
/* cfb.js (C) 2013-present SheetJS -- http://sheetjs.com */
/* vim: set ts=2: */
/*jshint eqnull:true */
/*exported CFB */
/*global Uint8Array:false, Uint16Array:false */

/*::
type SectorEntry = {
	name?:string;
	nodes?:Array<number>;
	data:RawBytes;
};
type SectorList = {
	[k:string|number]:SectorEntry;
	name:?string;
	fat_addrs:Array<number>;
	ssz:number;
}
type CFBFiles = {[n:string]:CFBEntry};
*/
/* crc32.js (C) 2014-present SheetJS -- http://sheetjs.com */
/* vim: set ts=2: */
/*exported CRC32 */
var CRC32 = /*#__PURE__*/(function() {
var CRC32 = {};
CRC32.version = '1.2.0';
/* see perf/crc32table.js */
/*global Int32Array */
function signed_crc_table()/*:any*/ {
	var c = 0, table/*:Array<number>*/ = new Array(256);

	for(var n =0; n != 256; ++n){
		c = n;
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		table[n] = c;
	}

	return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
}

var T0 = signed_crc_table();
function slice_by_16_tables(T) {
	var c = 0, v = 0, n = 0, table/*:Array<number>*/ = typeof Int32Array !== 'undefined' ? new Int32Array(4096) : new Array(4096) ;

	for(n = 0; n != 256; ++n) table[n] = T[n];
	for(n = 0; n != 256; ++n) {
		v = T[n];
		for(c = 256 + n; c < 4096; c += 256) v = table[c] = (v >>> 8) ^ T[v & 0xFF];
	}
	var out = [];
	for(n = 1; n != 16; ++n) out[n - 1] = typeof Int32Array !== 'undefined' && typeof table.subarray == "function" ? table.subarray(n * 256, n * 256 + 256) : table.slice(n * 256, n * 256 + 256);
	return out;
}
var TT = slice_by_16_tables(T0);
var T1 = TT[0],  T2 = TT[1],  T3 = TT[2],  T4 = TT[3],  T5 = TT[4];
var T6 = TT[5],  T7 = TT[6],  T8 = TT[7],  T9 = TT[8],  Ta = TT[9];
var Tb = TT[10], Tc = TT[11], Td = TT[12], Te = TT[13], Tf = TT[14];
function crc32_bstr(bstr/*:string*/, seed/*:number*/)/*:number*/ {
	var C = seed/*:: ? 0 : 0 */ ^ -1;
	for(var i = 0, L = bstr.length; i < L;) C = (C>>>8) ^ T0[(C^bstr.charCodeAt(i++))&0xFF];
	return ~C;
}

function crc32_buf(B/*:Uint8Array|Array<number>*/, seed/*:number*/)/*:number*/ {
	var C = seed/*:: ? 0 : 0 */ ^ -1, L = B.length - 15, i = 0;
	for(; i < L;) C =
		Tf[B[i++] ^ (C & 255)] ^
		Te[B[i++] ^ ((C >> 8) & 255)] ^
		Td[B[i++] ^ ((C >> 16) & 255)] ^
		Tc[B[i++] ^ (C >>> 24)] ^
		Tb[B[i++]] ^ Ta[B[i++]] ^ T9[B[i++]] ^ T8[B[i++]] ^
		T7[B[i++]] ^ T6[B[i++]] ^ T5[B[i++]] ^ T4[B[i++]] ^
		T3[B[i++]] ^ T2[B[i++]] ^ T1[B[i++]] ^ T0[B[i++]];
	L += 15;
	while(i < L) C = (C>>>8) ^ T0[(C^B[i++])&0xFF];
	return ~C;
}

function crc32_str(str/*:string*/, seed/*:number*/)/*:number*/ {
	var C = seed ^ -1;
	for(var i = 0, L = str.length, c = 0, d = 0; i < L;) {
		c = str.charCodeAt(i++);
		if(c < 0x80) {
			C = (C>>>8) ^ T0[(C^c)&0xFF];
		} else if(c < 0x800) {
			C = (C>>>8) ^ T0[(C ^ (192|((c>>6)&31)))&0xFF];
			C = (C>>>8) ^ T0[(C ^ (128|(c&63)))&0xFF];
		} else if(c >= 0xD800 && c < 0xE000) {
			c = (c&1023)+64; d = str.charCodeAt(i++)&1023;
			C = (C>>>8) ^ T0[(C ^ (240|((c>>8)&7)))&0xFF];
			C = (C>>>8) ^ T0[(C ^ (128|((c>>2)&63)))&0xFF];
			C = (C>>>8) ^ T0[(C ^ (128|((d>>6)&15)|((c&3)<<4)))&0xFF];
			C = (C>>>8) ^ T0[(C ^ (128|(d&63)))&0xFF];
		} else {
			C = (C>>>8) ^ T0[(C ^ (224|((c>>12)&15)))&0xFF];
			C = (C>>>8) ^ T0[(C ^ (128|((c>>6)&63)))&0xFF];
			C = (C>>>8) ^ T0[(C ^ (128|(c&63)))&0xFF];
		}
	}
	return ~C;
}
CRC32.table = T0;
CRC32.bstr = crc32_bstr;
CRC32.buf = crc32_buf;
CRC32.str = crc32_str;
return CRC32;
})();
/* [MS-CFB] v20171201 */
var CFB = /*#__PURE__*/(function _CFB(){
var exports/*:CFBModule*/ = /*::(*/{}/*:: :any)*/;
exports.version = '1.2.2';
/* [MS-CFB] 2.6.4 */
function namecmp(l/*:string*/, r/*:string*/)/*:number*/ {
	var L = l.split("/"), R = r.split("/");
	for(var i = 0, c = 0, Z = Math.min(L.length, R.length); i < Z; ++i) {
		if((c = L[i].length - R[i].length)) return c;
		if(L[i] != R[i]) return L[i] < R[i] ? -1 : 1;
	}
	return L.length - R.length;
}
function dirname(p/*:string*/)/*:string*/ {
	if(p.charAt(p.length - 1) == "/") return (p.slice(0,-1).indexOf("/") === -1) ? p : dirname(p.slice(0, -1));
	var c = p.lastIndexOf("/");
	return (c === -1) ? p : p.slice(0, c+1);
}

function filename(p/*:string*/)/*:string*/ {
	if(p.charAt(p.length - 1) == "/") return filename(p.slice(0, -1));
	var c = p.lastIndexOf("/");
	return (c === -1) ? p : p.slice(c+1);
}
/* -------------------------------------------------------------------------- */
/* DOS Date format:
   high|YYYYYYYm.mmmddddd.HHHHHMMM.MMMSSSSS|low
   add 1980 to stored year
   stored second should be doubled
*/

/* write JS date to buf as a DOS date */
function write_dos_date(buf/*:CFBlob*/, date/*:Date|string*/) {
	if(typeof date === "string") date = new Date(date);
	var hms/*:number*/ = date.getHours();
	hms = hms << 6 | date.getMinutes();
	hms = hms << 5 | (date.getSeconds()>>>1);
	buf.write_shift(2, hms);
	var ymd/*:number*/ = (date.getFullYear() - 1980);
	ymd = ymd << 4 | (date.getMonth()+1);
	ymd = ymd << 5 | date.getDate();
	buf.write_shift(2, ymd);
}

/* read four bytes from buf and interpret as a DOS date */
function parse_dos_date(buf/*:CFBlob*/)/*:Date*/ {
	var hms = buf.read_shift(2) & 0xFFFF;
	var ymd = buf.read_shift(2) & 0xFFFF;
	var val = new Date();
	var d = ymd & 0x1F; ymd >>>= 5;
	var m = ymd & 0x0F; ymd >>>= 4;
	val.setMilliseconds(0);
	val.setFullYear(ymd + 1980);
	val.setMonth(m-1);
	val.setDate(d);
	var S = hms & 0x1F; hms >>>= 5;
	var M = hms & 0x3F; hms >>>= 6;
	val.setHours(hms);
	val.setMinutes(M);
	val.setSeconds(S<<1);
	return val;
}
function parse_extra_field(blob/*:CFBlob*/)/*:any*/ {
	prep_blob(blob, 0);
	var o = /*::(*/{}/*:: :any)*/;
	var flags = 0;
	while(blob.l <= blob.length - 4) {
		var type = blob.read_shift(2);
		var sz = blob.read_shift(2), tgt = blob.l + sz;
		var p = {};
		switch(type) {
			/* UNIX-style Timestamps */
			case 0x5455: {
				flags = blob.read_shift(1);
				if(flags & 1) p.mtime = blob.read_shift(4);
				/* for some reason, CD flag corresponds to LFH */
				if(sz > 5) {
					if(flags & 2) p.atime = blob.read_shift(4);
					if(flags & 4) p.ctime = blob.read_shift(4);
				}
				if(p.mtime) p.mt = new Date(p.mtime*1000);
			} break;
			/* ZIP64 Extended Information Field */
			case 0x0001: {
				var sz1 = blob.read_shift(4), sz2 = blob.read_shift(4);
				p.usz = (sz2 * Math.pow(2,32) + sz1);
				sz1 = blob.read_shift(4); sz2 = blob.read_shift(4);
				p.csz = (sz2 * Math.pow(2,32) + sz1);
				// NOTE: volume fields are skipped
			} break;
		}
		blob.l = tgt;
		o[type] = p;
	}
	return o;
}
var fs/*:: = require('fs'); */;
function get_fs() { return fs || (fs = _fs); }
function parse(file/*:RawBytes*/, options/*:CFBReadOpts*/)/*:CFBContainer*/ {
if(file[0] == 0x50 && file[1] == 0x4b) return parse_zip(file, options);
if((file[0] | 0x20) == 0x6d && (file[1]|0x20) == 0x69) return parse_mad(file, options);
if(file.length < 512) throw new Error("CFB file size " + file.length + " < 512");
var mver = 3;
var ssz = 512;
var nmfs = 0; // number of mini FAT sectors
var difat_sec_cnt = 0;
var dir_start = 0;
var minifat_start = 0;
var difat_start = 0;

var fat_addrs/*:Array<number>*/ = []; // locations of FAT sectors

/* [MS-CFB] 2.2 Compound File Header */
var blob/*:CFBlob*/ = /*::(*/file.slice(0,512)/*:: :any)*/;
prep_blob(blob, 0);

/* major version */
var mv = check_get_mver(blob);
mver = mv[0];
switch(mver) {
	case 3: ssz = 512; break; case 4: ssz = 4096; break;
	case 0: if(mv[1] == 0) return parse_zip(file, options);
	/* falls through */
	default: throw new Error("Major Version: Expected 3 or 4 saw " + mver);
}

/* reprocess header */
if(ssz !== 512) { blob = /*::(*/file.slice(0,ssz)/*:: :any)*/; prep_blob(blob, 28 /* blob.l */); }
/* Save header for final object */
var header/*:RawBytes*/ = file.slice(0,ssz);

check_shifts(blob, mver);

// Number of Directory Sectors
var dir_cnt/*:number*/ = blob.read_shift(4, 'i');
if(mver === 3 && dir_cnt !== 0) throw new Error('# Directory Sectors: Expected 0 saw ' + dir_cnt);

// Number of FAT Sectors
blob.l += 4;

// First Directory Sector Location
dir_start = blob.read_shift(4, 'i');

// Transaction Signature
blob.l += 4;

// Mini Stream Cutoff Size
blob.chk('00100000', 'Mini Stream Cutoff Size: ');

// First Mini FAT Sector Location
minifat_start = blob.read_shift(4, 'i');

// Number of Mini FAT Sectors
nmfs = blob.read_shift(4, 'i');

// First DIFAT sector location
difat_start = blob.read_shift(4, 'i');

// Number of DIFAT Sectors
difat_sec_cnt = blob.read_shift(4, 'i');

// Grab FAT Sector Locations
for(var q = -1, j = 0; j < 109; ++j) { /* 109 = (512 - blob.l)>>>2; */
	q = blob.read_shift(4, 'i');
	if(q<0) break;
	fat_addrs[j] = q;
}

/** Break the file up into sectors */
var sectors/*:Array<RawBytes>*/ = sectorify(file, ssz);

sleuth_fat(difat_start, difat_sec_cnt, sectors, ssz, fat_addrs);

/** Chains */
var sector_list/*:SectorList*/ = make_sector_list(sectors, dir_start, fat_addrs, ssz);

if(dir_start < sector_list.length) sector_list[dir_start].name = "!Directory";
if(nmfs > 0 && minifat_start !== ENDOFCHAIN) sector_list[minifat_start].name = "!MiniFAT";
sector_list[fat_addrs[0]].name = "!FAT";
sector_list.fat_addrs = fat_addrs;
sector_list.ssz = ssz;

/* [MS-CFB] 2.6.1 Compound File Directory Entry */
var files/*:CFBFiles*/ = {}, Paths/*:Array<string>*/ = [], FileIndex/*:CFBFileIndex*/ = [], FullPaths/*:Array<string>*/ = [];
read_directory(dir_start, sector_list, sectors, Paths, nmfs, files, FileIndex, minifat_start);

build_full_paths(FileIndex, FullPaths, Paths);
Paths.shift();

var o = {
	FileIndex: FileIndex,
	FullPaths: FullPaths
};

// $FlowIgnore
if(options && options.raw) o.raw = {header: header, sectors: sectors};
return o;
} // parse

/* [MS-CFB] 2.2 Compound File Header -- read up to major version */
function check_get_mver(blob/*:CFBlob*/)/*:[number, number]*/ {
	if(blob[blob.l] == 0x50 && blob[blob.l + 1] == 0x4b) return [0, 0];
	// header signature 8
	blob.chk(HEADER_SIGNATURE, 'Header Signature: ');

	// clsid 16
	//blob.chk(HEADER_CLSID, 'CLSID: ');
	blob.l += 16;

	// minor version 2
	var mver/*:number*/ = blob.read_shift(2, 'u');

	return [blob.read_shift(2,'u'), mver];
}
function check_shifts(blob/*:CFBlob*/, mver/*:number*/)/*:void*/ {
	var shift = 0x09;

	// Byte Order
	//blob.chk('feff', 'Byte Order: '); // note: some writers put 0xffff
	blob.l += 2;

	// Sector Shift
	switch((shift = blob.read_shift(2))) {
		case 0x09: if(mver != 3) throw new Error('Sector Shift: Expected 9 saw ' + shift); break;
		case 0x0c: if(mver != 4) throw new Error('Sector Shift: Expected 12 saw ' + shift); break;
		default: throw new Error('Sector Shift: Expected 9 or 12 saw ' + shift);
	}

	// Mini Sector Shift
	blob.chk('0600', 'Mini Sector Shift: ');

	// Reserved
	blob.chk('000000000000', 'Reserved: ');
}

/** Break the file up into sectors */
function sectorify(file/*:RawBytes*/, ssz/*:number*/)/*:Array<RawBytes>*/ {
	var nsectors = Math.ceil(file.length/ssz)-1;
	var sectors/*:Array<RawBytes>*/ = [];
	for(var i=1; i < nsectors; ++i) sectors[i-1] = file.slice(i*ssz,(i+1)*ssz);
	sectors[nsectors-1] = file.slice(nsectors*ssz);
	return sectors;
}

/* [MS-CFB] 2.6.4 Red-Black Tree */
function build_full_paths(FI/*:CFBFileIndex*/, FP/*:Array<string>*/, Paths/*:Array<string>*/)/*:void*/ {
	var i = 0, L = 0, R = 0, C = 0, j = 0, pl = Paths.length;
	var dad/*:Array<number>*/ = [], q/*:Array<number>*/ = [];

	for(; i < pl; ++i) { dad[i]=q[i]=i; FP[i]=Paths[i]; }

	for(; j < q.length; ++j) {
		i = q[j];
		L = FI[i].L; R = FI[i].R; C = FI[i].C;
		if(dad[i] === i) {
			if(L !== -1 /*NOSTREAM*/ && dad[L] !== L) dad[i] = dad[L];
			if(R !== -1 && dad[R] !== R) dad[i] = dad[R];
		}
		if(C !== -1 /*NOSTREAM*/) dad[C] = i;
		if(L !== -1 && i != dad[i]) { dad[L] = dad[i]; if(q.lastIndexOf(L) < j) q.push(L); }
		if(R !== -1 && i != dad[i]) { dad[R] = dad[i]; if(q.lastIndexOf(R) < j) q.push(R); }
	}
	for(i=1; i < pl; ++i) if(dad[i] === i) {
		if(R !== -1 /*NOSTREAM*/ && dad[R] !== R) dad[i] = dad[R];
		else if(L !== -1 && dad[L] !== L) dad[i] = dad[L];
	}

	for(i=1; i < pl; ++i) {
		if(FI[i].type === 0 /* unknown */) continue;
		j = i;
		if(j != dad[j]) do {
			j = dad[j];
			FP[i] = FP[j] + "/" + FP[i];
		} while (j !== 0 && -1 !== dad[j] && j != dad[j]);
		dad[i] = -1;
	}

	FP[0] += "/";
	for(i=1; i < pl; ++i) {
		if(FI[i].type !== 2 /* stream */) FP[i] += "/";
	}
}

function get_mfat_entry(entry/*:CFBEntry*/, payload/*:RawBytes*/, mini/*:?RawBytes*/)/*:CFBlob*/ {
	var start = entry.start, size = entry.size;
	//return (payload.slice(start*MSSZ, start*MSSZ + size)/*:any*/);
	var o = [];
	var idx = start;
	while(mini && size > 0 && idx >= 0) {
		o.push(payload.slice(idx * MSSZ, idx * MSSZ + MSSZ));
		size -= MSSZ;
		idx = __readInt32LE(mini, idx * 4);
	}
	if(o.length === 0) return (new_buf(0)/*:any*/);
	return (bconcat(o).slice(0, entry.size)/*:any*/);
}

/** Chase down the rest of the DIFAT chain to build a comprehensive list
    DIFAT chains by storing the next sector number as the last 32 bits */
function sleuth_fat(idx/*:number*/, cnt/*:number*/, sectors/*:Array<RawBytes>*/, ssz/*:number*/, fat_addrs)/*:void*/ {
	var q/*:number*/ = ENDOFCHAIN;
	if(idx === ENDOFCHAIN) {
		if(cnt !== 0) throw new Error("DIFAT chain shorter than expected");
	} else if(idx !== -1 /*FREESECT*/) {
		var sector = sectors[idx], m = (ssz>>>2)-1;
		if(!sector) return;
		for(var i = 0; i < m; ++i) {
			if((q = __readInt32LE(sector,i*4)) === ENDOFCHAIN) break;
			fat_addrs.push(q);
		}
		if(cnt >= 1) sleuth_fat(__readInt32LE(sector,ssz-4),cnt - 1, sectors, ssz, fat_addrs);
	}
}

/** Follow the linked list of sectors for a given starting point */
function get_sector_list(sectors/*:Array<RawBytes>*/, start/*:number*/, fat_addrs/*:Array<number>*/, ssz/*:number*/, chkd/*:?Array<boolean>*/)/*:SectorEntry*/ {
	var buf/*:Array<number>*/ = [], buf_chain/*:Array<any>*/ = [];
	if(!chkd) chkd = [];
	var modulus = ssz - 1, j = 0, jj = 0;
	for(j=start; j>=0;) {
		chkd[j] = true;
		buf[buf.length] = j;
		buf_chain.push(sectors[j]);
		var addr = fat_addrs[Math.floor(j*4/ssz)];
		jj = ((j*4) & modulus);
		if(ssz < 4 + jj) throw new Error("FAT boundary crossed: " + j + " 4 "+ssz);
		if(!sectors[addr]) break;
		j = __readInt32LE(sectors[addr], jj);
	}
	return {nodes: buf, data:__toBuffer([buf_chain])};
}

/** Chase down the sector linked lists */
function make_sector_list(sectors/*:Array<RawBytes>*/, dir_start/*:number*/, fat_addrs/*:Array<number>*/, ssz/*:number*/)/*:SectorList*/ {
	var sl = sectors.length, sector_list/*:SectorList*/ = ([]/*:any*/);
	var chkd/*:Array<boolean>*/ = [], buf/*:Array<number>*/ = [], buf_chain/*:Array<RawBytes>*/ = [];
	var modulus = ssz - 1, i=0, j=0, k=0, jj=0;
	for(i=0; i < sl; ++i) {
		buf = ([]/*:Array<number>*/);
		k = (i + dir_start); if(k >= sl) k-=sl;
		if(chkd[k]) continue;
		buf_chain = [];
		var seen = [];
		for(j=k; j>=0;) {
			seen[j] = true;
			chkd[j] = true;
			buf[buf.length] = j;
			buf_chain.push(sectors[j]);
			var addr/*:number*/ = fat_addrs[Math.floor(j*4/ssz)];
			jj = ((j*4) & modulus);
			if(ssz < 4 + jj) throw new Error("FAT boundary crossed: " + j + " 4 "+ssz);
			if(!sectors[addr]) break;
			j = __readInt32LE(sectors[addr], jj);
			if(seen[j]) break;
		}
		sector_list[k] = ({nodes: buf, data:__toBuffer([buf_chain])}/*:SectorEntry*/);
	}
	return sector_list;
}

/* [MS-CFB] 2.6.1 Compound File Directory Entry */
function read_directory(dir_start/*:number*/, sector_list/*:SectorList*/, sectors/*:Array<RawBytes>*/, Paths/*:Array<string>*/, nmfs, files, FileIndex, mini) {
	var minifat_store = 0, pl = (Paths.length?2:0);
	var sector = sector_list[dir_start].data;
	var i = 0, namelen = 0, name;
	for(; i < sector.length; i+= 128) {
		var blob/*:CFBlob*/ = /*::(*/sector.slice(i, i+128)/*:: :any)*/;
		prep_blob(blob, 64);
		namelen = blob.read_shift(2);
		name = __utf16le(blob,0,namelen-pl);
		Paths.push(name);
		var o/*:CFBEntry*/ = ({
			name:  name,
			type:  blob.read_shift(1),
			color: blob.read_shift(1),
			L:     blob.read_shift(4, 'i'),
			R:     blob.read_shift(4, 'i'),
			C:     blob.read_shift(4, 'i'),
			clsid: blob.read_shift(16),
			state: blob.read_shift(4, 'i'),
			start: 0,
			size: 0
		});
		var ctime/*:number*/ = blob.read_shift(2) + blob.read_shift(2) + blob.read_shift(2) + blob.read_shift(2);
		if(ctime !== 0) o.ct = read_date(blob, blob.l-8);
		var mtime/*:number*/ = blob.read_shift(2) + blob.read_shift(2) + blob.read_shift(2) + blob.read_shift(2);
		if(mtime !== 0) o.mt = read_date(blob, blob.l-8);
		o.start = blob.read_shift(4, 'i');
		o.size = blob.read_shift(4, 'i');
		if(o.size < 0 && o.start < 0) { o.size = o.type = 0; o.start = ENDOFCHAIN; o.name = ""; }
		if(o.type === 5) { /* root */
			minifat_store = o.start;
			if(nmfs > 0 && minifat_store !== ENDOFCHAIN) sector_list[minifat_store].name = "!StreamData";
			/*minifat_size = o.size;*/
		} else if(o.size >= 4096 /* MSCSZ */) {
			o.storage = 'fat';
			if(sector_list[o.start] === undefined) sector_list[o.start] = get_sector_list(sectors, o.start, sector_list.fat_addrs, sector_list.ssz);
			sector_list[o.start].name = o.name;
			o.content = (sector_list[o.start].data.slice(0,o.size)/*:any*/);
		} else {
			o.storage = 'minifat';
			if(o.size < 0) o.size = 0;
			else if(minifat_store !== ENDOFCHAIN && o.start !== ENDOFCHAIN && sector_list[minifat_store]) {
				o.content = get_mfat_entry(o, sector_list[minifat_store].data, (sector_list[mini]||{}).data);
			}
		}
		if(o.content) prep_blob(o.content, 0);
		files[name] = o;
		FileIndex.push(o);
	}
}

function read_date(blob/*:RawBytes|CFBlob*/, offset/*:number*/)/*:Date*/ {
	return new Date(( ( (__readUInt32LE(blob,offset+4)/1e7)*Math.pow(2,32)+__readUInt32LE(blob,offset)/1e7 ) - 11644473600)*1000);
}

function read_file(filename/*:string*/, options/*:CFBReadOpts*/) {
	get_fs();
	return parse(fs.readFileSync(filename), options);
}

function read(blob/*:RawBytes|string*/, options/*:CFBReadOpts*/) {
	var type = options && options.type;
	if(!type) {
		if(has_buf && Buffer.isBuffer(blob)) type = "buffer";
	}
	switch(type || "base64") {
		case "file": /*:: if(typeof blob !== 'string') throw "Must pass a filename when type='file'"; */return read_file(blob, options);
		case "base64": /*:: if(typeof blob !== 'string') throw "Must pass a base64-encoded binary string when type='file'"; */return parse(s2a(Base64_decode(blob)), options);
		case "binary": /*:: if(typeof blob !== 'string') throw "Must pass a binary string when type='file'"; */return parse(s2a(blob), options);
	}
	return parse(/*::typeof blob == 'string' ? new Buffer(blob, 'utf-8') : */blob, options);
}

function init_cfb(cfb/*:CFBContainer*/, opts/*:?any*/)/*:void*/ {
	var o = opts || {}, root = o.root || "Root Entry";
	if(!cfb.FullPaths) cfb.FullPaths = [];
	if(!cfb.FileIndex) cfb.FileIndex = [];
	if(cfb.FullPaths.length !== cfb.FileIndex.length) throw new Error("inconsistent CFB structure");
	if(cfb.FullPaths.length === 0) {
		cfb.FullPaths[0] = root + "/";
		cfb.FileIndex[0] = ({ name: root, type: 5 }/*:any*/);
	}
	if(o.CLSID) cfb.FileIndex[0].clsid = o.CLSID;
	seed_cfb(cfb);
}
function seed_cfb(cfb/*:CFBContainer*/)/*:void*/ {
	var nm = "\u0001Sh33tJ5";
	if(CFB.find(cfb, "/" + nm)) return;
	var p = new_buf(4); p[0] = 55; p[1] = p[3] = 50; p[2] = 54;
	cfb.FileIndex.push(({ name: nm, type: 2, content:p, size:4, L:69, R:69, C:69 }/*:any*/));
	cfb.FullPaths.push(cfb.FullPaths[0] + nm);
	rebuild_cfb(cfb);
}
function rebuild_cfb(cfb/*:CFBContainer*/, f/*:?boolean*/)/*:void*/ {
	init_cfb(cfb);
	var gc = false, s = false;
	for(var i = cfb.FullPaths.length - 1; i >= 0; --i) {
		var _file = cfb.FileIndex[i];
		switch(_file.type) {
			case 0:
				if(s) gc = true;
				else { cfb.FileIndex.pop(); cfb.FullPaths.pop(); }
				break;
			case 1: case 2: case 5:
				s = true;
				if(isNaN(_file.R * _file.L * _file.C)) gc = true;
				if(_file.R > -1 && _file.L > -1 && _file.R == _file.L) gc = true;
				break;
			default: gc = true; break;
		}
	}
	if(!gc && !f) return;

	var now = new Date(1987, 1, 19), j = 0;
	// Track which names exist
	var fullPaths = Object.create ? Object.create(null) : {};
	var data/*:Array<[string, CFBEntry]>*/ = [];
	for(i = 0; i < cfb.FullPaths.length; ++i) {
		fullPaths[cfb.FullPaths[i]] = true;
		if(cfb.FileIndex[i].type === 0) continue;
		data.push([cfb.FullPaths[i], cfb.FileIndex[i]]);
	}
	for(i = 0; i < data.length; ++i) {
		var dad = dirname(data[i][0]);
		s = fullPaths[dad];
		while(!s) {
			while(dirname(dad) && !fullPaths[dirname(dad)]) dad = dirname(dad);

			data.push([dad, ({
				name: filename(dad).replace("/",""),
				type: 1,
				clsid: HEADER_CLSID,
				ct: now, mt: now,
				content: null
			}/*:any*/)]);

			// Add name to set
			fullPaths[dad] = true;

			dad = dirname(data[i][0]);
			s = fullPaths[dad];
		}
	}

	data.sort(function(x,y) { return namecmp(x[0], y[0]); });
	cfb.FullPaths = []; cfb.FileIndex = [];
	for(i = 0; i < data.length; ++i) { cfb.FullPaths[i] = data[i][0]; cfb.FileIndex[i] = data[i][1]; }
	for(i = 0; i < data.length; ++i) {
		var elt = cfb.FileIndex[i];
		var nm = cfb.FullPaths[i];

		elt.name =  filename(nm).replace("/","");
		elt.L = elt.R = elt.C = -(elt.color = 1);
		elt.size = elt.content ? elt.content.length : 0;
		elt.start = 0;
		elt.clsid = (elt.clsid || HEADER_CLSID);
		if(i === 0) {
			elt.C = data.length > 1 ? 1 : -1;
			elt.size = 0;
			elt.type = 5;
		} else if(nm.slice(-1) == "/") {
			for(j=i+1;j < data.length; ++j) if(dirname(cfb.FullPaths[j])==nm) break;
			elt.C = j >= data.length ? -1 : j;
			for(j=i+1;j < data.length; ++j) if(dirname(cfb.FullPaths[j])==dirname(nm)) break;
			elt.R = j >= data.length ? -1 : j;
			elt.type = 1;
		} else {
			if(dirname(cfb.FullPaths[i+1]||"") == dirname(nm)) elt.R = i + 1;
			elt.type = 2;
		}
	}

}

function _write(cfb/*:CFBContainer*/, options/*:CFBWriteOpts*/)/*:RawBytes|string*/ {
	var _opts = options || {};
	/* MAD is order-sensitive, skip rebuild and sort */
	if(_opts.fileType == 'mad') return write_mad(cfb, _opts);
	rebuild_cfb(cfb);
	switch(_opts.fileType) {
		case 'zip': return write_zip(cfb, _opts);
		//case 'mad': return write_mad(cfb, _opts);
	}
	var L = (function(cfb/*:CFBContainer*/)/*:Array<number>*/{
		var mini_size = 0, fat_size = 0;
		for(var i = 0; i < cfb.FileIndex.length; ++i) {
			var file = cfb.FileIndex[i];
			if(!file.content) continue;
			var flen = file.content.length;
			if(flen > 0){
				if(flen < 0x1000) mini_size += (flen + 0x3F) >> 6;
				else fat_size += (flen + 0x01FF) >> 9;
			}
		}
		var dir_cnt = (cfb.FullPaths.length +3) >> 2;
		var mini_cnt = (mini_size + 7) >> 3;
		var mfat_cnt = (mini_size + 0x7F) >> 7;
		var fat_base = mini_cnt + fat_size + dir_cnt + mfat_cnt;
		var fat_cnt = (fat_base + 0x7F) >> 7;
		var difat_cnt = fat_cnt <= 109 ? 0 : Math.ceil((fat_cnt-109)/0x7F);
		while(((fat_base + fat_cnt + difat_cnt + 0x7F) >> 7) > fat_cnt) difat_cnt = ++fat_cnt <= 109 ? 0 : Math.ceil((fat_cnt-109)/0x7F);
		var L =  [1, difat_cnt, fat_cnt, mfat_cnt, dir_cnt, fat_size, mini_size, 0];
		cfb.FileIndex[0].size = mini_size << 6;
		L[7] = (cfb.FileIndex[0].start=L[0]+L[1]+L[2]+L[3]+L[4]+L[5])+((L[6]+7) >> 3);
		return L;
	})(cfb);
	var o = new_buf(L[7] << 9);
	var i = 0, T = 0;
	{
		for(i = 0; i < 8; ++i) o.write_shift(1, HEADER_SIG[i]);
		for(i = 0; i < 8; ++i) o.write_shift(2, 0);
		o.write_shift(2, 0x003E);
		o.write_shift(2, 0x0003);
		o.write_shift(2, 0xFFFE);
		o.write_shift(2, 0x0009);
		o.write_shift(2, 0x0006);
		for(i = 0; i < 3; ++i) o.write_shift(2, 0);
		o.write_shift(4, 0);
		o.write_shift(4, L[2]);
		o.write_shift(4, L[0] + L[1] + L[2] + L[3] - 1);
		o.write_shift(4, 0);
		o.write_shift(4, 1<<12);
		o.write_shift(4, L[3] ? L[0] + L[1] + L[2] - 1: ENDOFCHAIN);
		o.write_shift(4, L[3]);
		o.write_shift(-4, L[1] ? L[0] - 1: ENDOFCHAIN);
		o.write_shift(4, L[1]);
		for(i = 0; i < 109; ++i) o.write_shift(-4, i < L[2] ? L[1] + i : -1);
	}
	if(L[1]) {
		for(T = 0; T < L[1]; ++T) {
			for(; i < 236 + T * 127; ++i) o.write_shift(-4, i < L[2] ? L[1] + i : -1);
			o.write_shift(-4, T === L[1] - 1 ? ENDOFCHAIN : T + 1);
		}
	}
	var chainit = function(w/*:number*/)/*:void*/ {
		for(T += w; i<T-1; ++i) o.write_shift(-4, i+1);
		if(w) { ++i; o.write_shift(-4, ENDOFCHAIN); }
	};
	T = i = 0;
	for(T+=L[1]; i<T; ++i) o.write_shift(-4, consts.DIFSECT);
	for(T+=L[2]; i<T; ++i) o.write_shift(-4, consts.FATSECT);
	chainit(L[3]);
	chainit(L[4]);
	var j/*:number*/ = 0, flen/*:number*/ = 0;
	var file/*:CFBEntry*/ = cfb.FileIndex[0];
	for(; j < cfb.FileIndex.length; ++j) {
		file = cfb.FileIndex[j];
		if(!file.content) continue;
		/*:: if(file.content == null) throw new Error("unreachable"); */
		flen = file.content.length;
		if(flen < 0x1000) continue;
		file.start = T;
		chainit((flen + 0x01FF) >> 9);
	}
	chainit((L[6] + 7) >> 3);
	while(o.l & 0x1FF) o.write_shift(-4, consts.ENDOFCHAIN);
	T = i = 0;
	for(j = 0; j < cfb.FileIndex.length; ++j) {
		file = cfb.FileIndex[j];
		if(!file.content) continue;
		/*:: if(file.content == null) throw new Error("unreachable"); */
		flen = file.content.length;
		if(!flen || flen >= 0x1000) continue;
		file.start = T;
		chainit((flen + 0x3F) >> 6);
	}
	while(o.l & 0x1FF) o.write_shift(-4, consts.ENDOFCHAIN);
	for(i = 0; i < L[4]<<2; ++i) {
		var nm = cfb.FullPaths[i];
		if(!nm || nm.length === 0) {
			for(j = 0; j < 17; ++j) o.write_shift(4, 0);
			for(j = 0; j < 3; ++j) o.write_shift(4, -1);
			for(j = 0; j < 12; ++j) o.write_shift(4, 0);
			continue;
		}
		file = cfb.FileIndex[i];
		if(i === 0) file.start = file.size ? file.start - 1 : ENDOFCHAIN;
		var _nm/*:string*/ = (i === 0 && _opts.root) || file.name;
		if(_nm.length > 31) {
			console.error("Name " + _nm + " will be truncated to " + _nm.slice(0,31));
			_nm = _nm.slice(0, 31);
		}
		flen = 2*(_nm.length+1);
		o.write_shift(64, _nm, "utf16le");
		o.write_shift(2, flen);
		o.write_shift(1, file.type);
		o.write_shift(1, file.color);
		o.write_shift(-4, file.L);
		o.write_shift(-4, file.R);
		o.write_shift(-4, file.C);
		if(!file.clsid) for(j = 0; j < 4; ++j) o.write_shift(4, 0);
		else o.write_shift(16, file.clsid, "hex");
		o.write_shift(4, file.state || 0);
		o.write_shift(4, 0); o.write_shift(4, 0);
		o.write_shift(4, 0); o.write_shift(4, 0);
		o.write_shift(4, file.start);
		o.write_shift(4, file.size); o.write_shift(4, 0);
	}
	for(i = 1; i < cfb.FileIndex.length; ++i) {
		file = cfb.FileIndex[i];
		/*:: if(!file.content) throw new Error("unreachable"); */
		if(file.size >= 0x1000) {
			o.l = (file.start+1) << 9;
			if (has_buf && Buffer.isBuffer(file.content)) {
				file.content.copy(o, o.l, 0, file.size);
				// o is a 0-filled Buffer so just set next offset
				o.l += (file.size + 511) & -512;
			} else {
				for(j = 0; j < file.size; ++j) o.write_shift(1, file.content[j]);
				for(; j & 0x1FF; ++j) o.write_shift(1, 0);
			}
		}
	}
	for(i = 1; i < cfb.FileIndex.length; ++i) {
		file = cfb.FileIndex[i];
		/*:: if(!file.content) throw new Error("unreachable"); */
		if(file.size > 0 && file.size < 0x1000) {
			if (has_buf && Buffer.isBuffer(file.content)) {
				file.content.copy(o, o.l, 0, file.size);
				// o is a 0-filled Buffer so just set next offset
				o.l += (file.size + 63) & -64;
			} else {
				for(j = 0; j < file.size; ++j) o.write_shift(1, file.content[j]);
				for(; j & 0x3F; ++j) o.write_shift(1, 0);
			}
		}
	}
	if (has_buf) {
		o.l = o.length;
	} else {
		// When using Buffer, already 0-filled
		while(o.l < o.length) o.write_shift(1, 0);
	}
	return o;
}
/* [MS-CFB] 2.6.4 (Unicode 3.0.1 case conversion) */
function find(cfb/*:CFBContainer*/, path/*:string*/)/*:?CFBEntry*/ {
	var UCFullPaths/*:Array<string>*/ = cfb.FullPaths.map(function(x) { return x.toUpperCase(); });
	var UCPaths/*:Array<string>*/ = UCFullPaths.map(function(x) { var y = x.split("/"); return y[y.length - (x.slice(-1) == "/" ? 2 : 1)]; });
	var k/*:boolean*/ = false;
	if(path.charCodeAt(0) === 47 /* "/" */) { k = true; path = UCFullPaths[0].slice(0, -1) + path; }
	else k = path.indexOf("/") !== -1;
	var UCPath/*:string*/ = path.toUpperCase();
	var w/*:number*/ = k === true ? UCFullPaths.indexOf(UCPath) : UCPaths.indexOf(UCPath);
	if(w !== -1) return cfb.FileIndex[w];

	var m = !UCPath.match(chr1);
	UCPath = UCPath.replace(chr0,'');
	if(m) UCPath = UCPath.replace(chr1,'!');
	for(w = 0; w < UCFullPaths.length; ++w) {
		if((m ? UCFullPaths[w].replace(chr1,'!') : UCFullPaths[w]).replace(chr0,'') == UCPath) return cfb.FileIndex[w];
		if((m ? UCPaths[w].replace(chr1,'!') : UCPaths[w]).replace(chr0,'') == UCPath) return cfb.FileIndex[w];
	}
	return null;
}
/** CFB Constants */
var MSSZ = 64; /* Mini Sector Size = 1<<6 */
//var MSCSZ = 4096; /* Mini Stream Cutoff Size */
/* 2.1 Compound File Sector Numbers and Types */
var ENDOFCHAIN = -2;
/* 2.2 Compound File Header */
var HEADER_SIGNATURE = 'd0cf11e0a1b11ae1';
var HEADER_SIG = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
var HEADER_CLSID = '00000000000000000000000000000000';
var consts = {
	/* 2.1 Compund File Sector Numbers and Types */
	MAXREGSECT: -6,
	DIFSECT: -4,
	FATSECT: -3,
	ENDOFCHAIN: ENDOFCHAIN,
	FREESECT: -1,
	/* 2.2 Compound File Header */
	HEADER_SIGNATURE: HEADER_SIGNATURE,
	HEADER_MINOR_VERSION: '3e00',
	MAXREGSID: -6,
	NOSTREAM: -1,
	HEADER_CLSID: HEADER_CLSID,
	/* 2.6.1 Compound File Directory Entry */
	EntryTypes: ['unknown','storage','stream','lockbytes','property','root']
};

function write_file(cfb/*:CFBContainer*/, filename/*:string*/, options/*:CFBWriteOpts*/)/*:void*/ {
	get_fs();
	var o = _write(cfb, options);
	/*:: if(typeof Buffer == 'undefined' || !Buffer.isBuffer(o) || !(o instanceof Buffer)) throw new Error("unreachable"); */
	fs.writeFileSync(filename, o);
}

function a2s(o/*:RawBytes*/)/*:string*/ {
	var out = new Array(o.length);
	for(var i = 0; i < o.length; ++i) out[i] = String.fromCharCode(o[i]);
	return out.join("");
}

function write(cfb/*:CFBContainer*/, options/*:CFBWriteOpts*/)/*:RawBytes|string*/ {
	var o = _write(cfb, options);
	switch(options && options.type || "buffer") {
		case "file": get_fs(); fs.writeFileSync(options.filename, (o/*:any*/)); return o;
		case "binary": return typeof o == "string" ? o : a2s(o);
		case "base64": return Base64_encode(typeof o == "string" ? o : a2s(o));
		case "buffer": if(has_buf) return Buffer.isBuffer(o) ? o : Buffer_from(o);
			/* falls through */
		case "array": return typeof o == "string" ? s2a(o) : o;
	}
	return o;
}
/* node < 8.1 zlib does not expose bytesRead, so default to pure JS */
var _zlib;
function use_zlib(zlib) { try {
	var InflateRaw = zlib.InflateRaw;
	var InflRaw = new InflateRaw();
	InflRaw._processChunk(new Uint8Array([3, 0]), InflRaw._finishFlushFlag);
	if(InflRaw.bytesRead) _zlib = zlib;
	else throw new Error("zlib does not expose bytesRead");
} catch(e) {console.error("cannot use native zlib: " + (e.message || e)); } }

function _inflateRawSync(payload, usz) {
	if(!_zlib) return _inflate(payload, usz);
	var InflateRaw = _zlib.InflateRaw;
	var InflRaw = new InflateRaw();
	var out = InflRaw._processChunk(payload.slice(payload.l), InflRaw._finishFlushFlag);
	payload.l += InflRaw.bytesRead;
	return out;
}

function _deflateRawSync(payload) {
	return _zlib ? _zlib.deflateRawSync(payload) : _deflate(payload);
}
var CLEN_ORDER = [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];

/*  LEN_ID = [ 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285 ]; */
var LEN_LN = [   3,   4,   5,   6,   7,   8,   9,  10,  11,  13 , 15,  17,  19,  23,  27,  31,  35,  43,  51,  59,  67,  83,  99, 115, 131, 163, 195, 227, 258 ];

/*  DST_ID = [  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13,  14,  15,  16,  17,  18,  19,   20,   21,   22,   23,   24,   25,   26,    27,    28,    29 ]; */
var DST_LN = [  1,  2,  3,  4,  5,  7,  9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577 ];

function bit_swap_8(n) { var t = (((((n<<1)|(n<<11)) & 0x22110) | (((n<<5)|(n<<15)) & 0x88440))); return ((t>>16) | (t>>8) |t)&0xFF; }

var use_typed_arrays = typeof Uint8Array !== 'undefined';

var bitswap8 = use_typed_arrays ? new Uint8Array(1<<8) : [];
for(var q = 0; q < (1<<8); ++q) bitswap8[q] = bit_swap_8(q);

function bit_swap_n(n, b) {
	var rev = bitswap8[n & 0xFF];
	if(b <= 8) return rev >>> (8-b);
	rev = (rev << 8) | bitswap8[(n>>8)&0xFF];
	if(b <= 16) return rev >>> (16-b);
	rev = (rev << 8) | bitswap8[(n>>16)&0xFF];
	return rev >>> (24-b);
}

/* helpers for unaligned bit reads */
function read_bits_2(buf, bl) { var w = (bl&7), h = (bl>>>3); return ((buf[h]|(w <= 6 ? 0 : buf[h+1]<<8))>>>w)& 0x03; }
function read_bits_3(buf, bl) { var w = (bl&7), h = (bl>>>3); return ((buf[h]|(w <= 5 ? 0 : buf[h+1]<<8))>>>w)& 0x07; }
function read_bits_4(buf, bl) { var w = (bl&7), h = (bl>>>3); return ((buf[h]|(w <= 4 ? 0 : buf[h+1]<<8))>>>w)& 0x0F; }
function read_bits_5(buf, bl) { var w = (bl&7), h = (bl>>>3); return ((buf[h]|(w <= 3 ? 0 : buf[h+1]<<8))>>>w)& 0x1F; }
function read_bits_7(buf, bl) { var w = (bl&7), h = (bl>>>3); return ((buf[h]|(w <= 1 ? 0 : buf[h+1]<<8))>>>w)& 0x7F; }

/* works up to n = 3 * 8 + 1 = 25 */
function read_bits_n(buf, bl, n) {
	var w = (bl&7), h = (bl>>>3), f = ((1<<n)-1);
	var v = buf[h] >>> w;
	if(n < 8 - w) return v & f;
	v |= buf[h+1]<<(8-w);
	if(n < 16 - w) return v & f;
	v |= buf[h+2]<<(16-w);
	if(n < 24 - w) return v & f;
	v |= buf[h+3]<<(24-w);
	return v & f;
}

/* helpers for unaligned bit writes */
function write_bits_3(buf, bl, v) { var w = bl & 7, h = bl >>> 3;
	if(w <= 5) buf[h] |= (v & 7) << w;
	else {
		buf[h] |= (v << w) & 0xFF;
		buf[h+1] = (v&7) >> (8-w);
	}
	return bl + 3;
}

function write_bits_1(buf, bl, v) {
	var w = bl & 7, h = bl >>> 3;
	v = (v&1) << w;
	buf[h] |= v;
	return bl + 1;
}
function write_bits_8(buf, bl, v) {
	var w = bl & 7, h = bl >>> 3;
	v <<= w;
	buf[h] |=  v & 0xFF; v >>>= 8;
	buf[h+1] = v;
	return bl + 8;
}
function write_bits_16(buf, bl, v) {
	var w = bl & 7, h = bl >>> 3;
	v <<= w;
	buf[h] |=  v & 0xFF; v >>>= 8;
	buf[h+1] = v & 0xFF;
	buf[h+2] = v >>> 8;
	return bl + 16;
}

/* until ArrayBuffer#realloc is a thing, fake a realloc */
function realloc(b, sz/*:number*/) {
	var L = b.length, M = 2*L > sz ? 2*L : sz + 5, i = 0;
	if(L >= sz) return b;
	if(has_buf) {
		var o = new_unsafe_buf(M);
		// $FlowIgnore
		if(b.copy) b.copy(o);
		else for(; i < b.length; ++i) o[i] = b[i];
		return o;
	} else if(use_typed_arrays) {
		var a = new Uint8Array(M);
		if(a.set) a.set(b);
		else for(; i < L; ++i) a[i] = b[i];
		return a;
	}
	b.length = M;
	return b;
}

/* zero-filled arrays for older browsers */
function zero_fill_array(n) {
	var o = new Array(n);
	for(var i = 0; i < n; ++i) o[i] = 0;
	return o;
}

/* build tree (used for literals and lengths) */
function build_tree(clens, cmap, MAX/*:number*/)/*:number*/ {
	var maxlen = 1, w = 0, i = 0, j = 0, ccode = 0, L = clens.length;

	var bl_count  = use_typed_arrays ? new Uint16Array(32) : zero_fill_array(32);
	for(i = 0; i < 32; ++i) bl_count[i] = 0;

	for(i = L; i < MAX; ++i) clens[i] = 0;
	L = clens.length;

	var ctree = use_typed_arrays ? new Uint16Array(L) : zero_fill_array(L); // []

	/* build code tree */
	for(i = 0; i < L; ++i) {
		bl_count[(w = clens[i])]++;
		if(maxlen < w) maxlen = w;
		ctree[i] = 0;
	}
	bl_count[0] = 0;
	for(i = 1; i <= maxlen; ++i) bl_count[i+16] = (ccode = (ccode + bl_count[i-1])<<1);
	for(i = 0; i < L; ++i) {
		ccode = clens[i];
		if(ccode != 0) ctree[i] = bl_count[ccode+16]++;
	}

	/* cmap[maxlen + 4 bits] = (off&15) + (lit<<4) reverse mapping */
	var cleni = 0;
	for(i = 0; i < L; ++i) {
		cleni = clens[i];
		if(cleni != 0) {
			ccode = bit_swap_n(ctree[i], maxlen)>>(maxlen-cleni);
			for(j = (1<<(maxlen + 4 - cleni)) - 1; j>=0; --j)
				cmap[ccode|(j<<cleni)] = (cleni&15) | (i<<4);
		}
	}
	return maxlen;
}

/* Fixed Huffman */
var fix_lmap = use_typed_arrays ? new Uint16Array(512) : zero_fill_array(512);
var fix_dmap = use_typed_arrays ? new Uint16Array(32)  : zero_fill_array(32);
if(!use_typed_arrays) {
	for(var i = 0; i < 512; ++i) fix_lmap[i] = 0;
	for(i = 0; i < 32; ++i) fix_dmap[i] = 0;
}
(function() {
	var dlens/*:Array<number>*/ = [];
	var i = 0;
	for(;i<32; i++) dlens.push(5);
	build_tree(dlens, fix_dmap, 32);

	var clens/*:Array<number>*/ = [];
	i = 0;
	for(; i<=143; i++) clens.push(8);
	for(; i<=255; i++) clens.push(9);
	for(; i<=279; i++) clens.push(7);
	for(; i<=287; i++) clens.push(8);
	build_tree(clens, fix_lmap, 288);
})();var _deflateRaw = /*#__PURE__*/(function _deflateRawIIFE() {
	var DST_LN_RE = use_typed_arrays ? new Uint8Array(0x8000) : [];
	var j = 0, k = 0;
	for(; j < DST_LN.length - 1; ++j) {
		for(; k < DST_LN[j+1]; ++k) DST_LN_RE[k] = j;
	}
	for(;k < 32768; ++k) DST_LN_RE[k] = 29;

	var LEN_LN_RE = use_typed_arrays ? new Uint8Array(0x103) : [];
	for(j = 0, k = 0; j < LEN_LN.length - 1; ++j) {
		for(; k < LEN_LN[j+1]; ++k) LEN_LN_RE[k] = j;
	}

	function write_stored(data, out) {
		var boff = 0;
		while(boff < data.length) {
			var L = Math.min(0xFFFF, data.length - boff);
			var h = boff + L == data.length;
			out.write_shift(1, +h);
			out.write_shift(2, L);
			out.write_shift(2, (~L) & 0xFFFF);
			while(L-- > 0) out[out.l++] = data[boff++];
		}
		return out.l;
	}

	/* Fixed Huffman */
	function write_huff_fixed(data, out) {
		var bl = 0;
		var boff = 0;
		var addrs = use_typed_arrays ? new Uint16Array(0x8000) : [];
		while(boff < data.length) {
			var L = /* data.length - boff; */ Math.min(0xFFFF, data.length - boff);

			/* write a stored block for short data */
			if(L < 10) {
				bl = write_bits_3(out, bl, +!!(boff + L == data.length)); // jshint ignore:line
				if(bl & 7) bl += 8 - (bl & 7);
				out.l = (bl / 8) | 0;
				out.write_shift(2, L);
				out.write_shift(2, (~L) & 0xFFFF);
				while(L-- > 0) out[out.l++] = data[boff++];
				bl = out.l * 8;
				continue;
			}

			bl = write_bits_3(out, bl, +!!(boff + L == data.length) + 2); // jshint ignore:line
			var hash = 0;
			while(L-- > 0) {
				var d = data[boff];
				hash = ((hash << 5) ^ d) & 0x7FFF;

				var match = -1, mlen = 0;

				if((match = addrs[hash])) {
					match |= boff & ~0x7FFF;
					if(match > boff) match -= 0x8000;
					if(match < boff) while(data[match + mlen] == data[boff + mlen] && mlen < 250) ++mlen;
				}

				if(mlen > 2) {
					/* Copy Token  */
					d = LEN_LN_RE[mlen];
					if(d <= 22) bl = write_bits_8(out, bl, bitswap8[d+1]>>1) - 1;
					else {
						write_bits_8(out, bl, 3);
						bl += 5;
						write_bits_8(out, bl, bitswap8[d-23]>>5);
						bl += 3;
					}
					var len_eb = (d < 8) ? 0 : ((d - 4)>>2);
					if(len_eb > 0) {
						write_bits_16(out, bl, mlen - LEN_LN[d]);
						bl += len_eb;
					}

					d = DST_LN_RE[boff - match];
					bl = write_bits_8(out, bl, bitswap8[d]>>3);
					bl -= 3;

					var dst_eb = d < 4 ? 0 : (d-2)>>1;
					if(dst_eb > 0) {
						write_bits_16(out, bl, boff - match - DST_LN[d]);
						bl += dst_eb;
					}
					for(var q = 0; q < mlen; ++q) {
						addrs[hash] = boff & 0x7FFF;
						hash = ((hash << 5) ^ data[boff]) & 0x7FFF;
						++boff;
					}
					L-= mlen - 1;
				} else {
					/* Literal Token */
					if(d <= 143) d = d + 48;
					else bl = write_bits_1(out, bl, 1);
					bl = write_bits_8(out, bl, bitswap8[d]);
					addrs[hash] = boff & 0x7FFF;
					++boff;
				}
			}

			bl = write_bits_8(out, bl, 0) - 1;
		}
		out.l = ((bl + 7)/8)|0;
		return out.l;
	}
	return function _deflateRaw(data, out) {
		if(data.length < 8) return write_stored(data, out);
		return write_huff_fixed(data, out);
	};
})();

function _deflate(data) {
	var buf = new_buf(50+Math.floor(data.length*1.1));
	var off = _deflateRaw(data, buf);
	return buf.slice(0, off);
}
/* modified inflate function also moves original read head */

var dyn_lmap = use_typed_arrays ? new Uint16Array(32768) : zero_fill_array(32768);
var dyn_dmap = use_typed_arrays ? new Uint16Array(32768) : zero_fill_array(32768);
var dyn_cmap = use_typed_arrays ? new Uint16Array(128)   : zero_fill_array(128);
var dyn_len_1 = 1, dyn_len_2 = 1;

/* 5.5.3 Expanding Huffman Codes */
function dyn(data, boff/*:number*/) {
	/* nomenclature from RFC1951 refers to bit values; these are offset by the implicit constant */
	var _HLIT = read_bits_5(data, boff) + 257; boff += 5;
	var _HDIST = read_bits_5(data, boff) + 1; boff += 5;
	var _HCLEN = read_bits_4(data, boff) + 4; boff += 4;
	var w = 0;

	/* grab and store code lengths */
	var clens = use_typed_arrays ? new Uint8Array(19) : zero_fill_array(19);
	var ctree = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
	var maxlen = 1;
	var bl_count =  use_typed_arrays ? new Uint8Array(8) : zero_fill_array(8);
	var next_code = use_typed_arrays ? new Uint8Array(8) : zero_fill_array(8);
	var L = clens.length; /* 19 */
	for(var i = 0; i < _HCLEN; ++i) {
		clens[CLEN_ORDER[i]] = w = read_bits_3(data, boff);
		if(maxlen < w) maxlen = w;
		bl_count[w]++;
		boff += 3;
	}

	/* build code tree */
	var ccode = 0;
	bl_count[0] = 0;
	for(i = 1; i <= maxlen; ++i) next_code[i] = ccode = (ccode + bl_count[i-1])<<1;
	for(i = 0; i < L; ++i) if((ccode = clens[i]) != 0) ctree[i] = next_code[ccode]++;
	/* cmap[7 bits from stream] = (off&7) + (lit<<3) */
	var cleni = 0;
	for(i = 0; i < L; ++i) {
		cleni = clens[i];
		if(cleni != 0) {
			ccode = bitswap8[ctree[i]]>>(8-cleni);
			for(var j = (1<<(7-cleni))-1; j>=0; --j) dyn_cmap[ccode|(j<<cleni)] = (cleni&7) | (i<<3);
		}
	}

	/* read literal and dist codes at once */
	var hcodes/*:Array<number>*/ = [];
	maxlen = 1;
	for(; hcodes.length < _HLIT + _HDIST;) {
		ccode = dyn_cmap[read_bits_7(data, boff)];
		boff += ccode & 7;
		switch((ccode >>>= 3)) {
			case 16:
				w = 3 + read_bits_2(data, boff); boff += 2;
				ccode = hcodes[hcodes.length - 1];
				while(w-- > 0) hcodes.push(ccode);
				break;
			case 17:
				w = 3 + read_bits_3(data, boff); boff += 3;
				while(w-- > 0) hcodes.push(0);
				break;
			case 18:
				w = 11 + read_bits_7(data, boff); boff += 7;
				while(w -- > 0) hcodes.push(0);
				break;
			default:
				hcodes.push(ccode);
				if(maxlen < ccode) maxlen = ccode;
				break;
		}
	}

	/* build literal / length trees */
	var h1 = hcodes.slice(0, _HLIT), h2 = hcodes.slice(_HLIT);
	for(i = _HLIT; i < 286; ++i) h1[i] = 0;
	for(i = _HDIST; i < 30; ++i) h2[i] = 0;
	dyn_len_1 = build_tree(h1, dyn_lmap, 286);
	dyn_len_2 = build_tree(h2, dyn_dmap, 30);
	return boff;
}

/* return [ data, bytesRead ] */
function inflate(data, usz/*:number*/) {
	/* shortcircuit for empty buffer [0x03, 0x00] */
	if(data[0] == 3 && !(data[1] & 0x3)) { return [new_raw_buf(usz), 2]; }

	/* bit offset */
	var boff = 0;

	/* header includes final bit and type bits */
	var header = 0;

	var outbuf = new_unsafe_buf(usz ? usz : (1<<18));
	var woff = 0;
	var OL = outbuf.length>>>0;
	var max_len_1 = 0, max_len_2 = 0;

	while((header&1) == 0) {
		header = read_bits_3(data, boff); boff += 3;
		if((header >>> 1) == 0) {
			/* Stored block */
			if(boff & 7) boff += 8 - (boff&7);
			/* 2 bytes sz, 2 bytes bit inverse */
			var sz = data[boff>>>3] | data[(boff>>>3)+1]<<8;
			boff += 32;
			/* push sz bytes */
			if(sz > 0) {
				if(!usz && OL < woff + sz) { outbuf = realloc(outbuf, woff + sz); OL = outbuf.length; }
				while(sz-- > 0) { outbuf[woff++] = data[boff>>>3]; boff += 8; }
			}
			continue;
		} else if((header >> 1) == 1) {
			/* Fixed Huffman */
			max_len_1 = 9; max_len_2 = 5;
		} else {
			/* Dynamic Huffman */
			boff = dyn(data, boff);
			max_len_1 = dyn_len_1; max_len_2 = dyn_len_2;
		}
		for(;;) { // while(true) is apparently out of vogue in modern JS circles
			if(!usz && (OL < woff + 32767)) { outbuf = realloc(outbuf, woff + 32767); OL = outbuf.length; }
			/* ingest code and move read head */
			var bits = read_bits_n(data, boff, max_len_1);
			var code = (header>>>1) == 1 ? fix_lmap[bits] : dyn_lmap[bits];
			boff += code & 15; code >>>= 4;
			/* 0-255 are literals, 256 is end of block token, 257+ are copy tokens */
			if(((code>>>8)&0xFF) === 0) outbuf[woff++] = code;
			else if(code == 256) break;
			else {
				code -= 257;
				var len_eb = (code < 8) ? 0 : ((code-4)>>2); if(len_eb > 5) len_eb = 0;
				var tgt = woff + LEN_LN[code];
				/* length extra bits */
				if(len_eb > 0) {
					tgt += read_bits_n(data, boff, len_eb);
					boff += len_eb;
				}

				/* dist code */
				bits = read_bits_n(data, boff, max_len_2);
				code = (header>>>1) == 1 ? fix_dmap[bits] : dyn_dmap[bits];
				boff += code & 15; code >>>= 4;
				var dst_eb = (code < 4 ? 0 : (code-2)>>1);
				var dst = DST_LN[code];
				/* dist extra bits */
				if(dst_eb > 0) {
					dst += read_bits_n(data, boff, dst_eb);
					boff += dst_eb;
				}

				/* in the common case, manual byte copy is faster than TA set / Buffer copy */
				if(!usz && OL < tgt) { outbuf = realloc(outbuf, tgt + 100); OL = outbuf.length; }
				while(woff < tgt) { outbuf[woff] = outbuf[woff - dst]; ++woff; }
			}
		}
	}
	if(usz) return [outbuf, (boff+7)>>>3];
	return [outbuf.slice(0, woff), (boff+7)>>>3];
}

function _inflate(payload, usz) {
	var data = payload.slice(payload.l||0);
	var out = inflate(data, usz);
	payload.l += out[1];
	return out[0];
}

function warn_or_throw(wrn, msg) {
	if(wrn) { if(typeof console !== 'undefined') console.error(msg); }
	else throw new Error(msg);
}

function parse_zip(file/*:RawBytes*/, options/*:CFBReadOpts*/)/*:CFBContainer*/ {
	var blob/*:CFBlob*/ = /*::(*/file/*:: :any)*/;
	prep_blob(blob, 0);

	var FileIndex/*:CFBFileIndex*/ = [], FullPaths/*:Array<string>*/ = [];
	var o = {
		FileIndex: FileIndex,
		FullPaths: FullPaths
	};
	init_cfb(o, { root: options.root });

	/* find end of central directory, start just after signature */
	var i = blob.length - 4;
	while((blob[i] != 0x50 || blob[i+1] != 0x4b || blob[i+2] != 0x05 || blob[i+3] != 0x06) && i >= 0) --i;
	blob.l = i + 4;

	/* parse end of central directory */
	blob.l += 4;
	var fcnt = blob.read_shift(2);
	blob.l += 6;
	var start_cd = blob.read_shift(4);

	/* parse central directory */
	blob.l = start_cd;

	for(i = 0; i < fcnt; ++i) {
		/* trust local file header instead of CD entry */
		blob.l += 20;
		var csz = blob.read_shift(4);
		var usz = blob.read_shift(4);
		var namelen = blob.read_shift(2);
		var efsz = blob.read_shift(2);
		var fcsz = blob.read_shift(2);
		blob.l += 8;
		var offset = blob.read_shift(4);
		var EF = parse_extra_field(/*::(*/blob.slice(blob.l+namelen, blob.l+namelen+efsz)/*:: :any)*/);
		blob.l += namelen + efsz + fcsz;

		var L = blob.l;
		blob.l = offset + 4;
		/* ZIP64 lengths */
		if(EF && EF[0x0001]) {
			if((EF[0x0001]||{}).usz) usz = EF[0x0001].usz;
			if((EF[0x0001]||{}).csz) csz = EF[0x0001].csz;
		}
		parse_local_file(blob, csz, usz, o, EF);
		blob.l = L;
	}

	return o;
}


/* head starts just after local file header signature */
function parse_local_file(blob/*:CFBlob*/, csz/*:number*/, usz/*:number*/, o/*:CFBContainer*/, EF) {
	/* [local file header] */
	blob.l += 2;
	var flags = blob.read_shift(2);
	var meth = blob.read_shift(2);
	var date = parse_dos_date(blob);

	if(flags & 0x2041) throw new Error("Unsupported ZIP encryption");
	var crc32 = blob.read_shift(4);
	var _csz = blob.read_shift(4);
	var _usz = blob.read_shift(4);

	var namelen = blob.read_shift(2);
	var efsz = blob.read_shift(2);

	// TODO: flags & (1<<11) // UTF8
	var name = ""; for(var i = 0; i < namelen; ++i) name += String.fromCharCode(blob[blob.l++]);
	if(efsz) {
		var ef = parse_extra_field(/*::(*/blob.slice(blob.l, blob.l + efsz)/*:: :any)*/);
		if((ef[0x5455]||{}).mt) date = ef[0x5455].mt;
		if((ef[0x0001]||{}).usz) _usz = ef[0x0001].usz;
		if((ef[0x0001]||{}).csz) _csz = ef[0x0001].csz;
		if(EF) {
			if((EF[0x5455]||{}).mt) date = EF[0x5455].mt;
			if((EF[0x0001]||{}).usz) _usz = ef[0x0001].usz;
			if((EF[0x0001]||{}).csz) _csz = ef[0x0001].csz;
		}
	}
	blob.l += efsz;

	/* [encryption header] */

	/* [file data] */
	var data = blob.slice(blob.l, blob.l + _csz);
	switch(meth) {
		case 8: data = _inflateRawSync(blob, _usz); break;
		case 0: break; // TODO: scan for magic number
		default: throw new Error("Unsupported ZIP Compression method " + meth);
	}

	/* [data descriptor] */
	var wrn = false;
	if(flags & 8) {
		crc32 = blob.read_shift(4);
		if(crc32 == 0x08074b50) { crc32 = blob.read_shift(4); wrn = true; }
		_csz = blob.read_shift(4);
		_usz = blob.read_shift(4);
	}

	if(_csz != csz) warn_or_throw(wrn, "Bad compressed size: " + csz + " != " + _csz);
	if(_usz != usz) warn_or_throw(wrn, "Bad uncompressed size: " + usz + " != " + _usz);
	//var _crc32 = CRC32.buf(data, 0);
	//if((crc32>>0) != (_crc32>>0)) warn_or_throw(wrn, "Bad CRC32 checksum: " + crc32 + " != " + _crc32);
	cfb_add(o, name, data, {unsafe: true, mt: date});
}
function write_zip(cfb/*:CFBContainer*/, options/*:CFBWriteOpts*/)/*:RawBytes*/ {
	var _opts = options || {};
	var out = [], cdirs = [];
	var o/*:CFBlob*/ = new_buf(1);
	var method = (_opts.compression ? 8 : 0), flags = 0;
	var desc = false;
	if(desc) flags |= 8;
	var i = 0, j = 0;

	var start_cd = 0, fcnt = 0;
	var root = cfb.FullPaths[0], fp = root, fi = cfb.FileIndex[0];
	var crcs = [];
	var sz_cd = 0;

	for(i = 1; i < cfb.FullPaths.length; ++i) {
		fp = cfb.FullPaths[i].slice(root.length); fi = cfb.FileIndex[i];
		if(!fi.size || !fi.content || fp == "\u0001Sh33tJ5") continue;
		var start = start_cd;

		/* TODO: CP437 filename */
		var namebuf = new_buf(fp.length);
		for(j = 0; j < fp.length; ++j) namebuf.write_shift(1, fp.charCodeAt(j) & 0x7F);
		namebuf = namebuf.slice(0, namebuf.l);
		crcs[fcnt] = typeof fi.content == "string" ? CRC32.bstr(fi.content, 0) : CRC32.buf(/*::((*/fi.content/*::||[]):any)*/, 0);

		var outbuf = typeof fi.content == "string" ? s2a(fi.content) : fi.content/*::||[]*/;
		if(method == 8) outbuf = _deflateRawSync(outbuf);

		/* local file header */
		o = new_buf(30);
		o.write_shift(4, 0x04034b50);
		o.write_shift(2, 20);
		o.write_shift(2, flags);
		o.write_shift(2, method);
		/* TODO: last mod file time/date */
		if(fi.mt) write_dos_date(o, fi.mt);
		else o.write_shift(4, 0);
		o.write_shift(-4, (flags & 8) ? 0 : crcs[fcnt]);
		o.write_shift(4,  (flags & 8) ? 0 : outbuf.length);
		o.write_shift(4,  (flags & 8) ? 0 : /*::(*/fi.content/*::||[])*/.length);
		o.write_shift(2, namebuf.length);
		o.write_shift(2, 0);

		start_cd += o.length;
		out.push(o);
		start_cd += namebuf.length;
		out.push(namebuf);

		/* TODO: extra fields? */

		/* TODO: encryption header ? */

		start_cd += outbuf.length;
		out.push(outbuf);

		/* data descriptor */
		if(flags & 8) {
			o = new_buf(12);
			o.write_shift(-4, crcs[fcnt]);
			o.write_shift(4, outbuf.length);
			o.write_shift(4, /*::(*/fi.content/*::||[])*/.length);
			start_cd += o.l;
			out.push(o);
		}

		/* central directory */
		o = new_buf(46);
		o.write_shift(4, 0x02014b50);
		o.write_shift(2, 0);
		o.write_shift(2, 20);
		o.write_shift(2, flags);
		o.write_shift(2, method);
		o.write_shift(4, 0); /* TODO: last mod file time/date */
		o.write_shift(-4, crcs[fcnt]);

		o.write_shift(4, outbuf.length);
		o.write_shift(4, /*::(*/fi.content/*::||[])*/.length);
		o.write_shift(2, namebuf.length);
		o.write_shift(2, 0);
		o.write_shift(2, 0);
		o.write_shift(2, 0);
		o.write_shift(2, 0);
		o.write_shift(4, 0);
		o.write_shift(4, start);

		sz_cd += o.l;
		cdirs.push(o);
		sz_cd += namebuf.length;
		cdirs.push(namebuf);
		++fcnt;
	}

	/* end of central directory */
	o = new_buf(22);
	o.write_shift(4, 0x06054b50);
	o.write_shift(2, 0);
	o.write_shift(2, 0);
	o.write_shift(2, fcnt);
	o.write_shift(2, fcnt);
	o.write_shift(4, sz_cd);
	o.write_shift(4, start_cd);
	o.write_shift(2, 0);

	return bconcat(([bconcat((out/*:any*/)), bconcat(cdirs), o]/*:any*/));
}
var ContentTypeMap = ({
	"htm": "text/html",
	"xml": "text/xml",

	"gif": "image/gif",
	"jpg": "image/jpeg",
	"png": "image/png",

	"mso": "application/x-mso",
	"thmx": "application/vnd.ms-officetheme",
	"sh33tj5": "application/octet-stream"
}/*:any*/);

function get_content_type(fi/*:CFBEntry*/, fp/*:string*/)/*:string*/ {
	if(fi.ctype) return fi.ctype;

	var ext = fi.name || "", m = ext.match(/\.([^\.]+)$/);
	if(m && ContentTypeMap[m[1]]) return ContentTypeMap[m[1]];

	if(fp) {
		m = (ext = fp).match(/[\.\\]([^\.\\])+$/);
		if(m && ContentTypeMap[m[1]]) return ContentTypeMap[m[1]];
	}

	return "application/octet-stream";
}

/* 76 character chunks TODO: intertwine encoding */
function write_base64_76(bstr/*:string*/)/*:string*/ {
	var data = Base64_encode(bstr);
	var o = [];
	for(var i = 0; i < data.length; i+= 76) o.push(data.slice(i, i+76));
	return o.join("\r\n") + "\r\n";
}

/*
Rules for QP:
	- escape =## applies for all non-display characters and literal "="
	- space or tab at end of line must be encoded
	- \r\n newlines can be preserved, but bare \r and \n must be escaped
	- lines must not exceed 76 characters, use soft breaks =\r\n

TODO: Some files from word appear to write line extensions with bare equals:

```
<table class=3DMsoTableGrid border=3D1 cellspacing=3D0 cellpadding=3D0 width=
="70%"
```
*/
function write_quoted_printable(text/*:string*/)/*:string*/ {
	var encoded = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7E-\xFF=]/g, function(c) {
		var w = c.charCodeAt(0).toString(16).toUpperCase();
		return "=" + (w.length == 1 ? "0" + w : w);
	});

	encoded = encoded.replace(/ $/mg, "=20").replace(/\t$/mg, "=09");

	if(encoded.charAt(0) == "\n") encoded = "=0D" + encoded.slice(1);
	encoded = encoded.replace(/\r(?!\n)/mg, "=0D").replace(/\n\n/mg, "\n=0A").replace(/([^\r\n])\n/mg, "$1=0A");

	var o/*:Array<string>*/ = [], split = encoded.split("\r\n");
	for(var si = 0; si < split.length; ++si) {
		var str = split[si];
		if(str.length == 0) { o.push(""); continue; }
		for(var i = 0; i < str.length;) {
			var end = 76;
			var tmp = str.slice(i, i + end);
			if(tmp.charAt(end - 1) == "=") end --;
			else if(tmp.charAt(end - 2) == "=") end -= 2;
			else if(tmp.charAt(end - 3) == "=") end -= 3;
			tmp = str.slice(i, i + end);
			i += end;
			if(i < str.length) tmp += "=";
			o.push(tmp);
		}
	}

	return o.join("\r\n");
}
function parse_quoted_printable(data/*:Array<string>*/)/*:RawBytes*/ {
	var o = [];

	/* unify long lines */
	for(var di = 0; di < data.length; ++di) {
		var line = data[di];
		while(di <= data.length && line.charAt(line.length - 1) == "=") line = line.slice(0, line.length - 1) + data[++di];
		o.push(line);
	}

	/* decode */
	for(var oi = 0; oi < o.length; ++oi) o[oi] = o[oi].replace(/[=][0-9A-Fa-f]{2}/g, function($$) { return String.fromCharCode(parseInt($$.slice(1), 16)); });
	return s2a(o.join("\r\n"));
}


function parse_mime(cfb/*:CFBContainer*/, data/*:Array<string>*/, root/*:string*/)/*:void*/ {
	var fname = "", cte = "", ctype = "", fdata;
	var di = 0;
	for(;di < 10; ++di) {
		var line = data[di];
		if(!line || line.match(/^\s*$/)) break;
		var m = line.match(/^([^:]*?):\s*([^\s].*)$/);
		if(m) switch(m[1].toLowerCase()) {
			case "content-location": fname = m[2].trim(); break;
			case "content-type": ctype = m[2].trim(); break;
			case "content-transfer-encoding": cte = m[2].trim(); break;
		}
	}
	++di;
	switch(cte.toLowerCase()) {
		case 'base64': fdata = s2a(Base64_decode(data.slice(di).join(""))); break;
		case 'quoted-printable': fdata = parse_quoted_printable(data.slice(di)); break;
		default: throw new Error("Unsupported Content-Transfer-Encoding " + cte);
	}
	var file = cfb_add(cfb, fname.slice(root.length), fdata, {unsafe: true});
	if(ctype) file.ctype = ctype;
}

function parse_mad(file/*:RawBytes*/, options/*:CFBReadOpts*/)/*:CFBContainer*/ {
	if(a2s(file.slice(0,13)).toLowerCase() != "mime-version:") throw new Error("Unsupported MAD header");
	var root = (options && options.root || "");
	// $FlowIgnore
	var data = (has_buf && Buffer.isBuffer(file) ? file.toString("binary") : a2s(file)).split("\r\n");
	var di = 0, row = "";

	/* if root is not specified, scan for the common prefix */
	for(di = 0; di < data.length; ++di) {
		row = data[di];
		if(!/^Content-Location:/i.test(row)) continue;
		row = row.slice(row.indexOf("file"));
		if(!root) root = row.slice(0, row.lastIndexOf("/") + 1);
		if(row.slice(0, root.length) == root) continue;
		while(root.length > 0) {
			root = root.slice(0, root.length - 1);
			root = root.slice(0, root.lastIndexOf("/") + 1);
			if(row.slice(0,root.length) == root) break;
		}
	}

	var mboundary = (data[1] || "").match(/boundary="(.*?)"/);
	if(!mboundary) throw new Error("MAD cannot find boundary");
	var boundary = "--" + (mboundary[1] || "");

	var FileIndex/*:CFBFileIndex*/ = [], FullPaths/*:Array<string>*/ = [];
	var o = {
		FileIndex: FileIndex,
		FullPaths: FullPaths
	};
	init_cfb(o);
	var start_di, fcnt = 0;
	for(di = 0; di < data.length; ++di) {
		var line = data[di];
		if(line !== boundary && line !== boundary + "--") continue;
		if(fcnt++) parse_mime(o, data.slice(start_di, di), root);
		start_di = di;
	}
	return o;
}

function write_mad(cfb/*:CFBContainer*/, options/*:CFBWriteOpts*/)/*:string*/ {
	var opts = options || {};
	var boundary = opts.boundary || "SheetJS";
	boundary = '------=' + boundary;

	var out = [
		'MIME-Version: 1.0',
		'Content-Type: multipart/related; boundary="' + boundary.slice(2) + '"',
		'',
		'',
		''
	];

	var root = cfb.FullPaths[0], fp = root, fi = cfb.FileIndex[0];
	for(var i = 1; i < cfb.FullPaths.length; ++i) {
		fp = cfb.FullPaths[i].slice(root.length);
		fi = cfb.FileIndex[i];
		if(!fi.size || !fi.content || fp == "\u0001Sh33tJ5") continue;

		/* Normalize filename */
		fp = fp.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7E-\xFF]/g, function(c) {
			return "_x" + c.charCodeAt(0).toString(16) + "_";
		}).replace(/[\u0080-\uFFFF]/g, function(u) {
			return "_u" + u.charCodeAt(0).toString(16) + "_";
		});

		/* Extract content as binary string */
		var ca = fi.content;
		// $FlowIgnore
		var cstr = has_buf && Buffer.isBuffer(ca) ? ca.toString("binary") : a2s(ca);

		/* 4/5 of first 1024 chars ascii -> quoted printable, else base64 */
		var dispcnt = 0, L = Math.min(1024, cstr.length), cc = 0;
		for(var csl = 0; csl <= L; ++csl) if((cc=cstr.charCodeAt(csl)) >= 0x20 && cc < 0x80) ++dispcnt;
		var qp = dispcnt >= L * 4 / 5;

		out.push(boundary);
		out.push('Content-Location: ' + (opts.root || 'file:///C:/SheetJS/') + fp);
		out.push('Content-Transfer-Encoding: ' + (qp ? 'quoted-printable' : 'base64'));
		out.push('Content-Type: ' + get_content_type(fi, fp));
		out.push('');

		out.push(qp ? write_quoted_printable(cstr) : write_base64_76(cstr));
	}
	out.push(boundary + '--\r\n');
	return out.join("\r\n");
}
function cfb_new(opts/*:?any*/)/*:CFBContainer*/ {
	var o/*:CFBContainer*/ = ({}/*:any*/);
	init_cfb(o, opts);
	return o;
}

function cfb_add(cfb/*:CFBContainer*/, name/*:string*/, content/*:?RawBytes*/, opts/*:?any*/)/*:CFBEntry*/ {
	var unsafe = opts && opts.unsafe;
	if(!unsafe) init_cfb(cfb);
	var file = !unsafe && CFB.find(cfb, name);
	if(!file) {
		var fpath/*:string*/ = cfb.FullPaths[0];
		if(name.slice(0, fpath.length) == fpath) fpath = name;
		else {
			if(fpath.slice(-1) != "/") fpath += "/";
			fpath = (fpath + name).replace("//","/");
		}
		file = ({name: filename(name), type: 2}/*:any*/);
		cfb.FileIndex.push(file);
		cfb.FullPaths.push(fpath);
		if(!unsafe) CFB.utils.cfb_gc(cfb);
	}
	/*:: if(!file) throw new Error("unreachable"); */
	file.content = (content/*:any*/);
	file.size = content ? content.length : 0;
	if(opts) {
		if(opts.CLSID) file.clsid = opts.CLSID;
		if(opts.mt) file.mt = opts.mt;
		if(opts.ct) file.ct = opts.ct;
	}
	return file;
}

function cfb_del(cfb/*:CFBContainer*/, name/*:string*/)/*:boolean*/ {
	init_cfb(cfb);
	var file = CFB.find(cfb, name);
	if(file) for(var j = 0; j < cfb.FileIndex.length; ++j) if(cfb.FileIndex[j] == file) {
		cfb.FileIndex.splice(j, 1);
		cfb.FullPaths.splice(j, 1);
		return true;
	}
	return false;
}

function cfb_mov(cfb/*:CFBContainer*/, old_name/*:string*/, new_name/*:string*/)/*:boolean*/ {
	init_cfb(cfb);
	var file = CFB.find(cfb, old_name);
	if(file) for(var j = 0; j < cfb.FileIndex.length; ++j) if(cfb.FileIndex[j] == file) {
		cfb.FileIndex[j].name = filename(new_name);
		cfb.FullPaths[j] = new_name;
		return true;
	}
	return false;
}

function cfb_gc(cfb/*:CFBContainer*/)/*:void*/ { rebuild_cfb(cfb, true); }

exports.find = find;
exports.read = read;
exports.parse = parse;
exports.write = write;
exports.writeFile = write_file;
exports.utils = {
	cfb_new: cfb_new,
	cfb_add: cfb_add,
	cfb_del: cfb_del,
	cfb_mov: cfb_mov,
	cfb_gc: cfb_gc,
	ReadShift: ReadShift,
	CheckField: CheckField,
	prep_blob: prep_blob,
	bconcat: bconcat,
	use_zlib: use_zlib,
	_deflateRaw: _deflate,
	_inflateRaw: _inflate,
	consts: consts
};

return exports;
})();

var _fs;
function set_fs(fs) { _fs = fs; }

/* normalize data for blob ctor */
function blobify(data) {
	if(typeof data === "string") return s2ab(data);
	if(Array.isArray(data)) return a2u(data);
	return data;
}
/* write or download file */
function write_dl(fname/*:string*/, payload/*:any*/, enc/*:?string*/) {
	/*global IE_SaveFile, Blob, navigator, saveAs, document, File, chrome */
	if(typeof _fs !== 'undefined' && _fs.writeFileSync) return enc ? _fs.writeFileSync(fname, payload, enc) : _fs.writeFileSync(fname, payload);
	if(typeof Deno !== 'undefined') {
		/* in this spot, it's safe to assume typed arrays and TextEncoder/TextDecoder exist */
		if(enc && typeof payload == "string") switch(enc) {
			case "utf8": payload = new TextEncoder(enc).encode(payload); break;
			case "binary": payload = s2ab(payload); break;
			/* TODO: binary equivalent */
			default: throw new Error("Unsupported encoding " + enc);
		}
		return Deno.writeFileSync(fname, payload);
	}
	var data = (enc == "utf8") ? utf8write(payload) : payload;
	/*:: declare var IE_SaveFile: any; */
	if(typeof IE_SaveFile !== 'undefined') return IE_SaveFile(data, fname);
	if(typeof Blob !== 'undefined') {
		var blob = new Blob([blobify(data)], {type:"application/octet-stream"});
		/*:: declare var navigator: any; */
		if(typeof navigator !== 'undefined' && navigator.msSaveBlob) return navigator.msSaveBlob(blob, fname);
		/*:: declare var saveAs: any; */
		if(typeof saveAs !== 'undefined') return saveAs(blob, fname);
		if(typeof URL !== 'undefined' && typeof document !== 'undefined' && document.createElement && URL.createObjectURL) {
			var url = URL.createObjectURL(blob);
			/*:: declare var chrome: any; */
			if(typeof chrome === 'object' && typeof (chrome.downloads||{}).download == "function") {
				if(URL.revokeObjectURL && typeof setTimeout !== 'undefined') setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
				return chrome.downloads.download({ url: url, filename: fname, saveAs: true });
			}
			var a = document.createElement("a");
			if(a.download != null) {
				/*:: if(document.body == null) throw new Error("unreachable"); */
				a.download = fname; a.href = url; document.body.appendChild(a); a.click();
				/*:: if(document.body == null) throw new Error("unreachable"); */ document.body.removeChild(a);
				if(URL.revokeObjectURL && typeof setTimeout !== 'undefined') setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
				return url;
			}
		} else if(typeof URL !== 'undefined' && !URL.createObjectURL && typeof chrome === 'object') {
			/* manifest v3 extensions -- no URL.createObjectURL */
			var b64 = "data:application/octet-stream;base64," + Base64_encode_arr(new Uint8Array(blobify(data)));
			return chrome.downloads.download({ url: b64, filename: fname, saveAs: true });
		}
	}
	// $FlowIgnore
	if(typeof $ !== 'undefined' && typeof File !== 'undefined' && typeof Folder !== 'undefined') try { // extendscript
		// $FlowIgnore
		var out = File(fname); out.open("w"); out.encoding = "binary";
		if(Array.isArray(payload)) payload = a2s(payload);
		out.write(payload); out.close(); return payload;
	} catch(e) { if(!e.message || e.message.indexOf("onstruct") == -1) throw e; }
	throw new Error("cannot save file " + fname);
}

/* read binary data from file */
function read_binary(path/*:string*/) {
	if(typeof _fs !== 'undefined') return _fs.readFileSync(path);
	if(typeof Deno !== 'undefined') return Deno.readFileSync(path);
	// $FlowIgnore
	if(typeof $ !== 'undefined' && typeof File !== 'undefined' && typeof Folder !== 'undefined') try { // extendscript
		// $FlowIgnore
		var infile = File(path); infile.open("r"); infile.encoding = "binary";
		var data = infile.read(); infile.close();
		return data;
	} catch(e) { if(!e.message || e.message.indexOf("onstruct") == -1) throw e; }
	throw new Error("Cannot access file " + path);
}
function keys(o/*:any*/)/*:Array<any>*/ {
	var ks = Object.keys(o), o2 = [];
	for(var i = 0; i < ks.length; ++i) if(Object.prototype.hasOwnProperty.call(o, ks[i])) o2.push(ks[i]);
	return o2;
}

function evert_key(obj/*:any*/, key/*:string*/)/*:EvertType*/ {
	var o = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) if(o[obj[K[i]][key]] == null) o[obj[K[i]][key]] = K[i];
	return o;
}

function evert(obj/*:any*/)/*:EvertType*/ {
	var o = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) o[obj[K[i]]] = K[i];
	return o;
}

function evert_num(obj/*:any*/)/*:EvertNumType*/ {
	var o = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) o[obj[K[i]]] = parseInt(K[i],10);
	return o;
}

function evert_arr(obj/*:any*/)/*:EvertArrType*/ {
	var o/*:EvertArrType*/ = ([]/*:any*/), K = keys(obj);
	for(var i = 0; i !== K.length; ++i) {
		if(o[obj[K[i]]] == null) o[obj[K[i]]] = [];
		o[obj[K[i]]].push(K[i]);
	}
	return o;
}

var dnthresh  = /*#__PURE__*/Date.UTC(1899, 11, 30, 0, 0, 0); // -2209161600000
var dnthresh1 = /*#__PURE__*/Date.UTC(1899, 11, 31, 0, 0, 0); // -2209075200000
var dnthresh2 = /*#__PURE__*/Date.UTC(1904, 0, 1, 0, 0, 0); // -2209075200000
function datenum(v/*:Date*/, date1904/*:?boolean*/)/*:number*/ {
	var epoch = /*#__PURE__*/v.getTime();
	var res = (epoch - dnthresh) / (24 * 60 * 60 * 1000);
	if(date1904) { res -= 1462; return res < -1402 ? res - 1 : res; }
	return res < 60 ? res - 1 : res;
}
function numdate(v/*:number*/)/*:Date|number*/ {
	if(v >= 60 && v < 61) return v;
	var out = new Date();
	out.setTime((v>60 ? v : (v+1)) * 24 * 60 * 60 * 1000 + dnthresh);
	return out;
}

/* ISO 8601 Duration */
function parse_isodur(s) {
	var sec = 0, mt = 0, time = false;
	var m = s.match(/P([0-9\.]+Y)?([0-9\.]+M)?([0-9\.]+D)?T([0-9\.]+H)?([0-9\.]+M)?([0-9\.]+S)?/);
	if(!m) throw new Error("|" + s + "| is not an ISO8601 Duration");
	for(var i = 1; i != m.length; ++i) {
		if(!m[i]) continue;
		mt = 1;
		if(i > 3) time = true;
		switch(m[i].slice(m[i].length-1)) {
			case 'Y':
				throw new Error("Unsupported ISO Duration Field: " + m[i].slice(m[i].length-1));
			case 'D': mt *= 24;
				/* falls through */
			case 'H': mt *= 60;
				/* falls through */
			case 'M':
				if(!time) throw new Error("Unsupported ISO Duration Field: M");
				else mt *= 60;
				/* falls through */
			case 'S': break;
		}
		sec += mt * parseInt(m[i], 10);
	}
	return sec;
}

/* Blame https://bugs.chromium.org/p/v8/issues/detail?id=7863 for the regexide */
var pdre1 = /^(\d+):(\d+)(:\d+)?(\.\d+)?$/; // HH:MM[:SS[.UUU]]
var pdre2 = /^(\d+)-(\d+)-(\d+)$/; // YYYY-mm-dd
var pdre3 = /^(\d+)-(\d+)-(\d+)[T ](\d+):(\d+)(:\d+)?(\.\d+)?$/; // YYYY-mm-dd(T or space)HH:MM[:SS[.UUU]], sans "Z"
/* parses a date string as a UTC date */
function parseDate(str/*:string*/, date1904/*:boolean*/)/*:Date*/ {
	if(str instanceof Date) return str;
	var m = str.match(pdre1);
	if(m) return new Date((date1904 ? dnthresh2 : dnthresh1) + ((parseInt(m[1], 10)*60 + parseInt(m[2], 10))*60 + (m[3] ? parseInt(m[3].slice(1), 10) : 0))*1000 + (m[4] ? parseInt((m[4]+"000").slice(1,4), 10) : 0));
	m = str.match(pdre2);
	if(m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], 0, 0, 0, 0));
	/* TODO: 1900-02-29T00:00:00.000 should return a flag to treat as a date code (affects xlml) */
	m = str.match(pdre3);
	if(m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], ((m[6] && parseInt(m[6].slice(1), 10))|| 0), ((m[7] && parseInt((m[7] + "0000").slice(1,4), 10))||0)));
	var d = new Date(str);
	return d;
}

function cc2str(arr/*:Array<number>*/, debomit)/*:string*/ {
	if(has_buf && Buffer.isBuffer(arr)) {
		if(debomit && buf_utf16le) {
			// TODO: temporary patch
			if(arr[0] == 0xFF && arr[1] == 0xFE) return utf8write(arr.slice(2).toString("utf16le"));
			if(arr[1] == 0xFE && arr[2] == 0xFF) return utf8write(utf16beread(arr.slice(2).toString("binary")));
		}
		return arr.toString("binary");
	}

	if(typeof TextDecoder !== "undefined") try {
		if(debomit) {
			if(arr[0] == 0xFF && arr[1] == 0xFE) return utf8write(new TextDecoder("utf-16le").decode(arr.slice(2)));
			if(arr[0] == 0xFE && arr[1] == 0xFF) return utf8write(new TextDecoder("utf-16be").decode(arr.slice(2)));
		}
		var rev = {
			"\u20ac": "\x80", "\u201a": "\x82", "\u0192": "\x83", "\u201e": "\x84",
			"\u2026": "\x85", "\u2020": "\x86", "\u2021": "\x87", "\u02c6": "\x88",
			"\u2030": "\x89", "\u0160": "\x8a", "\u2039": "\x8b", "\u0152": "\x8c",
			"\u017d": "\x8e", "\u2018": "\x91", "\u2019": "\x92", "\u201c": "\x93",
			"\u201d": "\x94", "\u2022": "\x95", "\u2013": "\x96", "\u2014": "\x97",
			"\u02dc": "\x98", "\u2122": "\x99", "\u0161": "\x9a", "\u203a": "\x9b",
			"\u0153": "\x9c", "\u017e": "\x9e", "\u0178": "\x9f"
		};
		if(Array.isArray(arr)) arr = new Uint8Array(arr);
		return new TextDecoder("latin1").decode(arr).replace(/[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, function(c) { return rev[c] || c; });
	} catch(e) {}

	var o = [], i = 0;
	// this cascade is for the browsers and runtimes of antiquity (and for modern runtimes that lack TextEncoder)
	try {
		for(i = 0; i < arr.length - 65536; i+=65536) o.push(String.fromCharCode.apply(0, arr.slice(i, i + 65536)));
		o.push(String.fromCharCode.apply(0, arr.slice(i)));
	} catch(e) { try {
			for(; i < arr.length - 16384; i+=16384) o.push(String.fromCharCode.apply(0, arr.slice(i, i + 16384)));
			o.push(String.fromCharCode.apply(0, arr.slice(i)));
		} catch(e) {
			for(; i != arr.length; ++i) o.push(String.fromCharCode(arr[i]));
		}
	}
	return o.join("");
}

function dup(o/*:any*/)/*:any*/ {
	if(typeof JSON != 'undefined' && !Array.isArray(o)) return JSON.parse(JSON.stringify(o));
	if(typeof o != 'object' || o == null) return o;
	if(o instanceof Date) return new Date(o.getTime());
	var out = {};
	for(var k in o) if(Object.prototype.hasOwnProperty.call(o, k)) out[k] = dup(o[k]);
	return out;
}

function fill(c/*:string*/,l/*:number*/)/*:string*/ { var o = ""; while(o.length < l) o+=c; return o; }

/* TODO: stress test */
function fuzzynum(s/*:string*/)/*:number*/ {
	var v/*:number*/ = Number(s);
	if(!isNaN(v)) return isFinite(v) ? v : NaN;
	if(!/\d/.test(s)) return v;
	var wt = 1;
	var ss = s.replace(/([\d]),([\d])/g,"$1$2").replace(/[$]/g,"").replace(/[%]/g, function() { wt *= 100; return "";});
	if(!isNaN(v = Number(ss))) return v / wt;
	ss = ss.replace(/[(]([^()]*)[)]/,function($$, $1) { wt = -wt; return $1;});
	if(!isNaN(v = Number(ss))) return v / wt;
	return v;
}

/* NOTE: Chrome rejects bare times like 1:23 PM */
var FDRE1 = /^(0?\d|1[0-2])(?:|:([0-5]?\d)(?:|(\.\d+)(?:|:([0-5]?\d))|:([0-5]?\d)(|\.\d+)))\s+([ap])m?$/;
var FDRE2 = /^([01]?\d|2[0-3])(?:|:([0-5]?\d)(?:|(\.\d+)(?:|:([0-5]?\d))|:([0-5]?\d)(|\.\d+)))$/;
var FDISO = /^(\d+)-(\d+)-(\d+)[T ](\d+):(\d+)(:\d+)(\.\d+)?[Z]?$/; // YYYY-mm-dd(T or space)HH:MM:SS[.UUU][Z]

/* TODO: 1904 adjustment */
var utc_append_works = new Date("6/9/69 00:00 UTC").valueOf() == -17798400000;
function fuzzytime1(M) /*:Date*/ {
	if(!M[2]) return new Date(Date.UTC(1899,11,31,(+M[1]%12) + (M[7] == "p" ? 12 : 0), 0, 0, 0));
	if(M[3]) {
			if(M[4]) return new Date(Date.UTC(1899,11,31,(+M[1]%12) + (M[7] == "p" ? 12 : 0), +M[2], +M[4], parseFloat(M[3])*1000));
			else return new Date(Date.UTC(1899,11,31,(M[7] == "p" ? 12 : 0), +M[1], +M[2], parseFloat(M[3])*1000));
	}
	else if(M[5]) return new Date(Date.UTC(1899,11,31, (+M[1]%12) + (M[7] == "p" ? 12 : 0), +M[2], +M[5], M[6] ? parseFloat(M[6]) * 1000 : 0));
	else return new Date(Date.UTC(1899,11,31,(+M[1]%12) + (M[7] == "p" ? 12 : 0), +M[2], 0, 0));
}
function fuzzytime2(M) /*:Date*/ {
	if(!M[2]) return new Date(Date.UTC(1899,11,31,+M[1], 0, 0, 0));
	if(M[3]) {
			if(M[4]) return new Date(Date.UTC(1899,11,31,+M[1], +M[2], +M[4], parseFloat(M[3])*1000));
			else return new Date(Date.UTC(1899,11,31,0, +M[1], +M[2], parseFloat(M[3])*1000));
	}
	else if(M[5]) return new Date(Date.UTC(1899,11,31, +M[1], +M[2], +M[5], M[6] ? parseFloat(M[6]) * 1000 : 0));
	else return new Date(Date.UTC(1899,11,31,+M[1], +M[2], 0, 0));
}
var lower_months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function fuzzydate(s/*:string*/)/*:Date*/ {
	// See issue 2863 -- this is technically not supported in Excel but is otherwise useful
	if(FDISO.test(s)) return s.indexOf("Z") == -1 ? local_to_utc(new Date(s)) : new Date(s);
	var lower = s.toLowerCase();
	var lnos = lower.replace(/\s+/g, " ").trim();
	var M = lnos.match(FDRE1);
	if(M) return fuzzytime1(M);
	M = lnos.match(FDRE2);
	if(M) return fuzzytime2(M);
	M = lnos.match(pdre3);
	if(M) return new Date(Date.UTC(+M[1], +M[2]-1, +M[3], +M[4], +M[5], ((M[6] && parseInt(M[6].slice(1), 10))|| 0), ((M[7] && parseInt((M[7] + "0000").slice(1,4), 10))||0)));
	var o = new Date(utc_append_works && s.indexOf("UTC") == -1 ? s + " UTC": s), n = new Date(NaN);
	var y = o.getYear(), m = o.getMonth(), d = o.getDate();
	if(isNaN(d)) return n;
	if(lower.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/)) {
		lower = lower.replace(/[^a-z]/g,"").replace(/([^a-z]|^)[ap]m?([^a-z]|$)/,"");
		if(lower.length > 3 && lower_months.indexOf(lower) == -1) return n;
	} else if(lower.replace(/[ap]m?/, "").match(/[a-z]/)) return n;
	if(y < 0 || y > 8099 || s.match(/[^-0-9:,\/\\\ ]/)) return n;
	return o;
}

var split_regex = /*#__PURE__*/(function() {
	var safe_split_regex = "abacaba".split(/(:?b)/i).length == 5;
	return function split_regex(str/*:string*/, re, def/*:string*/)/*:Array<string>*/ {
		if(safe_split_regex || typeof re == "string") return str.split(re);
		var p = str.split(re), o = [p[0]];
		for(var i = 1; i < p.length; ++i) { o.push(def); o.push(p[i]); }
		return o;
	};
})();

function utc_to_local(utc) {
	return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), utc.getUTCHours(), utc.getUTCMinutes(), utc.getUTCSeconds(), utc.getUTCMilliseconds());
}
function local_to_utc(local) {
	return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes(), local.getSeconds(), local.getMilliseconds()));
}

function remove_doctype(str) {
	var preamble = str.slice(0, 1024);
	var si = preamble.indexOf("<!DOCTYPE");
	if(si == -1) return str;
	var m = str.match(/<[\w]/);
	if(!m) return str;
	return str.slice(0, si) + str.slice(m.index);
}

/* str.match(/<!--[\s\S]*?-->/g) --> str_match_ng(str, "<!--", "-->") */
function str_match_ng(str, s, e) {
  var out = [];

  var si = str.indexOf(s);
  while(si > -1) {
    var ei = str.indexOf(e, si + s.length);
		if(ei == -1) break;

		out.push(str.slice(si, ei + e.length));
		si = str.indexOf(s, ei + e.length);
	}

  return out.length > 0 ? out : null;
}

/* str.replace(/<!--[\s\S]*?-->/g, "") --> str_remove_ng(str, "<!--", "-->") */
function str_remove_ng(str, s, e) {
  var out = [], last = 0;

  var si = str.indexOf(s);
	if(si == -1) return str;
  while(si > -1) {
		out.push(str.slice(last, si));
    var ei = str.indexOf(e, si + s.length);
		if(ei == -1) break;

		if((si = str.indexOf(s, (last = ei + e.length))) == -1) out.push(str.slice(last));
	}

  return out.join("");
}

/* str.match(/<tag\b[^>]*?>([\s\S]*?)</tag>/) --> str_match_xml(str, "tag") */
var xml_boundary = { " ": 1, "\t": 1, "\r": 1, "\n": 1, ">": 1 };
function str_match_xml(str, tag) {
	var si = str.indexOf('<' + tag), w = tag.length + 1, L = str.length;
	while(si >= 0 && si <= L - w && !xml_boundary[str.charAt(si + w)]) si = str.indexOf('<' + tag, si+1);
	if(si === -1) return null;
	var sf = str.indexOf(">", si + tag.length);
	if(sf === -1) return null;
	var et = "</" + tag + ">";
	var ei = str.indexOf(et, sf);
	if(ei == -1) return null;
	return [str.slice(si, ei + et.length), str.slice(sf + 1, ei)];
}

/* str.match(/<(?:\w+:)?tag\b[^<>]*?>([\s\S]*?)<\/(?:\w+:)?tag>/) --> str_match_xml(str, "tag") */
var str_match_xml_ns = /*#__PURE__*/(function() {
	var str_match_xml_ns_cache = {};
	return function str_match_xml_ns(str, tag) {
		var res = str_match_xml_ns_cache[tag];
		if(!res) str_match_xml_ns_cache[tag] = res = [
			new RegExp('<(?:\\w+:)?'+tag+'\\b[^<>]*>', "g"),
			new RegExp('</(?:\\w+:)?'+tag+'>', "g")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m = res[0].exec(str);
		if(!m) return null;
		var si = m.index;
		var sf = res[0].lastIndex;
		res[1].lastIndex = res[0].lastIndex;
		m = res[1].exec(str);
		if(!m) return null;
		var ei = m.index;
		var ef = res[1].lastIndex;
		return [str.slice(si, ef), str.slice(sf, ei)];
	};
})();

/* str.match(/<(?:\w+:)?tag\b[^<>]*?>([\s\S]*?)<\/(?:\w+:)?tag>/g) --> str_match_xml_ns_g(str, "tag") */
var str_match_xml_ns_g = /*#__PURE__*/(function() {
	var str_match_xml_ns_cache = {};
	return function str_match_xml_ns(str, tag) {
		var out = [];
		var res = str_match_xml_ns_cache[tag];
		if(!res) str_match_xml_ns_cache[tag] = res = [
			new RegExp('<(?:\\w+:)?'+tag+'\\b[^<>]*>', "g"),
			new RegExp('</(?:\\w+:)?'+tag+'>', "g")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m;
		while((m = res[0].exec(str))) {
			var si = m.index;
			res[1].lastIndex = res[0].lastIndex;
			m = res[1].exec(str);
			if(!m) return null;
			var ef = res[1].lastIndex;
			out.push(str.slice(si, ef));
			res[0].lastIndex = res[1].lastIndex;
		}
		return out.length == 0 ? null : out;
	};
})();
var str_remove_xml_ns_g = /*#__PURE__*/(function() {
	var str_remove_xml_ns_cache = {};
	return function str_remove_xml_ns_g(str, tag) {
		var out = [];
		var res = str_remove_xml_ns_cache[tag];
		if(!res) str_remove_xml_ns_cache[tag] = res = [
			new RegExp('<(?:\\w+:)?'+tag+'\\b[^<>]*>', "g"),
			new RegExp('</(?:\\w+:)?'+tag+'>', "g")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m;
		var si = 0, ef = 0;
		while((m = res[0].exec(str))) {
			si = m.index;
			out.push(str.slice(ef, si));
			ef = si;
			res[1].lastIndex = res[0].lastIndex;
			m = res[1].exec(str);
			if(!m) return null;
			ef = res[1].lastIndex;
			res[0].lastIndex = res[1].lastIndex;
		}
		out.push(str.slice(ef));
		return out.length == 0 ? "" : out.join("");
	};
})();

/* str.match(/<(?:\w+:)?tag\b[^>]*?>([\s\S]*?)<\/(?:\w+:)?tag>/gi) --> str_match_xml_ns_ig(str, "tag") */
var str_match_xml_ig = /*#__PURE__*/(function() {
	var str_match_xml_ns_cache = {};
	return function str_match_xml_ns(str, tag) {
		var out = [];
		var res = str_match_xml_ns_cache[tag];
		if(!res) str_match_xml_ns_cache[tag] = res = [
			new RegExp('<'+tag+'\\b[^<>]*>', "ig"),
			new RegExp('</'+tag+'>', "ig")
		];
		res[0].lastIndex = res[1].lastIndex = 0;
		var m;
		while((m = res[0].exec(str))) {
			var si = m.index;
			res[1].lastIndex = res[0].lastIndex;
			m = res[1].exec(str);
			if(!m) return null;
			var ef = res[1].lastIndex;
			out.push(str.slice(si, ef));
			res[0].lastIndex = res[1].lastIndex;
		}
		return out.length == 0 ? null : out;
	};
})();
function getdatastr(data)/*:?string*/ {
	if(!data) return null;
	if(data.content && data.type) return cc2str(data.content, true);
	if(data.data) return debom(data.data);
	if(data.asNodeBuffer && has_buf) return debom(data.asNodeBuffer().toString('binary'));
	if(data.asBinary) return debom(data.asBinary());
	if(data._data && data._data.getContent) return debom(cc2str(Array.prototype.slice.call(data._data.getContent(),0)));
	return null;
}

function getdatabin(data) {
	if(!data) return null;
	if(data.data) return char_codes(data.data);
	if(data.asNodeBuffer && has_buf) return data.asNodeBuffer();
	if(data._data && data._data.getContent) {
		var o = data._data.getContent();
		if(typeof o == "string") return char_codes(o);
		return Array.prototype.slice.call(o);
	}
	if(data.content && data.type) return data.content;
	return null;
}

function getdata(data) { return (data && data.name.slice(-4) === ".bin") ? getdatabin(data) : getdatastr(data); }

/* Part 2 Section 10.1.2 "Mapping Content Types" Names are case-insensitive */
/* OASIS does not comment on filename case sensitivity */
function safegetzipfile(zip, file/*:string*/) {
	var k = zip.FullPaths || keys(zip.files);
	var f = file.toLowerCase().replace(/[\/]/g, '\\'), g = f.replace(/\\/g,'\/');
	for(var i=0; i<k.length; ++i) {
		var n = k[i].replace(/^Root Entry[\/]/,"").toLowerCase();
		if(f == n || g == n) return zip.files ? zip.files[k[i]] : zip.FileIndex[i];
	}
	return null;
}

function getzipfile(zip, file/*:string*/) {
	var o = safegetzipfile(zip, file);
	if(o == null) throw new Error("Cannot find file " + file + " in zip");
	return o;
}

function getzipdata(zip, file/*:string*/, safe/*:?boolean*/)/*:any*/ {
	if(!safe) return getdata(getzipfile(zip, file));
	if(!file) return null;
	try { return getzipdata(zip, file); } catch(e) { return null; }
}

function getzipstr(zip, file/*:string*/, safe/*:?boolean*/)/*:?string*/ {
	if(!safe) return getdatastr(getzipfile(zip, file));
	if(!file) return null;
	try { return getzipstr(zip, file); } catch(e) { return null; }
}

function getzipbin(zip, file/*:string*/, safe/*:?boolean*/)/*:any*/ {
	if(!safe) return getdatabin(getzipfile(zip, file));
	if(!file) return null;
	try { return getzipbin(zip, file); } catch(e) { return null; }
}

function zipentries(zip) {
	var k = zip.FullPaths || keys(zip.files), o = [];
	for(var i = 0; i < k.length; ++i) if(k[i].slice(-1) != '/') o.push(k[i].replace(/^Root Entry[\/]/, ""));
	return o.sort();
}

function zip_add_file(zip, path, content) {
	if(zip.FullPaths) {
		if(typeof content == "string") {
			var res;
			if(has_buf) res = Buffer_from(content);
			/* TODO: investigate performance in Edge 13 */
			//else if(typeof TextEncoder !== "undefined") res = new TextEncoder().encode(content);
			else res = utf8decode(content);
			return CFB.utils.cfb_add(zip, path, res);
		}
		CFB.utils.cfb_add(zip, path, content);
	}
	else zip.file(path, content);
}

function zip_new() { return CFB.utils.cfb_new(); }

function zip_read(d, o) {
	switch(o.type) {
		case "base64": return CFB.read(d, { type: "base64" });
		case "binary": return CFB.read(d, { type: "binary" });
		case "buffer": case "array": return CFB.read(d, { type: "buffer" });
	}
	throw new Error("Unrecognized type " + o.type);
}

function resolve_path(path/*:string*/, base/*:string*/)/*:string*/ {
	if(path.charAt(0) == "/") return path.slice(1);
	var result = base.split('/');
	if(base.slice(-1) != "/") result.pop(); // folder path
	var target = path.split('/');
	while (target.length !== 0) {
		var step = target.shift();
		if (step === '..') result.pop();
		else if (step !== '.') result.push(step);
	}
	return result.join('/');
}
var XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';
var attregexg=/\s([^"\s?>\/]+)\s*=\s*((?:")([^"]*)(?:")|(?:')([^']*)(?:')|([^'">\s]+))/g;
var tagregex1=/<[\/\?]?[a-zA-Z0-9:_-]+(?:\s+[^"\s?<>\/]+\s*=\s*(?:"[^"]*"|'[^']*'|[^'"<>\s=]+))*\s*[\/\?]?>/mg, tagregex2 = /<[^<>]*>/g;
var tagregex = /*#__PURE__*/XML_HEADER.match(tagregex1) ? tagregex1 : tagregex2;
var nsregex=/<\w*:/, nsregex2 = /<(\/?)\w+:/;
function parsexmltag(tag/*:string*/, skip_root/*:?boolean*/, skip_LC/*:?boolean*/)/*:any*/ {
	var z = ({}/*:any*/);
	var eq = 0, c = 0;
	for(; eq !== tag.length; ++eq) if((c = tag.charCodeAt(eq)) === 32 || c === 10 || c === 13) break;
	if(!skip_root) z[0] = tag.slice(0, eq);
	if(eq === tag.length) return z;
	var m = tag.match(attregexg), j=0, v="", i=0, q="", cc="", quot = 1;
	if(m) for(i = 0; i != m.length; ++i) {
		cc = m[i].slice(1);
		for(c=0; c != cc.length; ++c) if(cc.charCodeAt(c) === 61) break;
		q = cc.slice(0,c).trim();
		while(cc.charCodeAt(c+1) == 32) ++c;
		quot = ((eq=cc.charCodeAt(c+1)) == 34 || eq == 39) ? 1 : 0;
		v = cc.slice(c+1+quot, cc.length-quot);
		for(j=0;j!=q.length;++j) if(q.charCodeAt(j) === 58) break;
		if(j===q.length) {
			if(q.indexOf("_") > 0) q = q.slice(0, q.indexOf("_")); // from ods
			z[q] = v;
			if(!skip_LC) z[q.toLowerCase()] = v;
		}
		else {
			var k = (j===5 && q.slice(0,5)==="xmlns"?"xmlns":"")+q.slice(j+1);
			if(z[k] && q.slice(j-3,j) == "ext") continue; // from ods
			z[k] = v;
			if(!skip_LC) z[k.toLowerCase()] = v;
		}
	}
	return z;
}
function strip_ns(x/*:string*/)/*:string*/ { return x.replace(nsregex2, "<$1"); }

var encodings = {
	'&quot;': '"',
	'&apos;': "'",
	'&gt;': '>',
	'&lt;': '<',
	'&amp;': '&'
};
var rencoding = /*#__PURE__*/evert(encodings);
//var rencstr = "&<>'\"".split("");

// TODO: CP remap (need to read file version to determine OS)
var unescapexml/*:StringConv*/ = /*#__PURE__*/(function() {
	/* 22.4.2.4 bstr (Basic String) */
	var encregex = /&(?:quot|apos|gt|lt|amp|#x?([\da-fA-F]+));/ig, coderegex = /_x([\da-fA-F]{4})_/ig;
	function raw_unescapexml(text/*:string*/)/*:string*/ {
		var s = text + '', i = s.indexOf("<![CDATA[");
		if(i == -1) return s.replace(encregex, function($$, $1) { return encodings[$$]||String.fromCharCode(parseInt($1,$$.indexOf("x")>-1?16:10))||$$; }).replace(coderegex,function(m,c) {return String.fromCharCode(parseInt(c,16));});
		var j = s.indexOf("]]>");
		return raw_unescapexml(s.slice(0, i)) + s.slice(i+9,j) + raw_unescapexml(s.slice(j+3));
	}
	return function unescapexml(text/*:string*/, xlsx/*:boolean*/) {
		var out = raw_unescapexml(text);
		return xlsx ? out.replace(/\r\n/g, "\n") : out;
	};
})();

var decregex=/[&<>'"]/g, charegex = /[\u0000-\u0008\u000b-\u001f\uFFFE-\uFFFF]/g;
function escapexml(text/*:string*/)/*:string*/{
	var s = text + '';
	return s.replace(decregex, function(y) { return rencoding[y]; }).replace(charegex,function(s) { return "_x" + ("000"+s.charCodeAt(0).toString(16)).slice(-4) + "_";});
}
function escapexmltag(text/*:string*/)/*:string*/{ return escapexml(text).replace(/ /g,"_x0020_"); }

var htmlcharegex = /[\u0000-\u001f]/g;
function escapehtml(text/*:string*/)/*:string*/{
	var s = text + '';
	return s.replace(decregex, function(y) { return rencoding[y]; }).replace(/\n/g, "<br/>").replace(htmlcharegex,function(s) { return "&#x" + ("000"+s.charCodeAt(0).toString(16)).slice(-4) + ";"; });
}

function escapexlml(text/*:string*/)/*:string*/{
	var s = text + '';
	return s.replace(decregex, function(y) { return rencoding[y]; }).replace(htmlcharegex,function(s) { return "&#x" + (s.charCodeAt(0).toString(16)).toUpperCase() + ";"; });
}

/* TODO: handle codepages */
var xlml_fixstr/*:StringConv*/ = /*#__PURE__*/(function() {
	var entregex = /&#(\d+);/g;
	function entrepl($$/*:string*/,$1/*:string*/)/*:string*/ { return String.fromCharCode(parseInt($1,10)); }
	return function xlml_fixstr(str/*:string*/)/*:string*/ { return str.replace(entregex,entrepl); };
})();
function xlml_unfixstr(str/*:string*/)/*:string*/ { return str.replace(/(\r\n|[\r\n])/g,"\&#10;"); }

/* note: xsd:boolean valid values: true / 1 / false / 0 */
function parsexmlbool(value/*:any*/)/*:boolean*/ {
	switch(value) {
		case 1: case true:  case '1': case 'true':  return true;
		case 0: case false: case '0': case 'false': return false;
		//default: throw new Error("Invalid xsd:boolean " + value);
	}
	return false;
}

function utf8reada(orig/*:string*/)/*:string*/ {
	var out = "", i = 0, c = 0, d = 0, e = 0, f = 0, w = 0;
	while (i < orig.length) {
		c = orig.charCodeAt(i++);
		if (c < 128) { out += String.fromCharCode(c); continue; }
		d = orig.charCodeAt(i++);
		if (c>191 && c<224) { f = ((c & 31) << 6); f |= (d & 63); out += String.fromCharCode(f); continue; }
		e = orig.charCodeAt(i++);
		if (c < 240) { out += String.fromCharCode(((c & 15) << 12) | ((d & 63) << 6) | (e & 63)); continue; }
		f = orig.charCodeAt(i++);
		w = (((c & 7) << 18) | ((d & 63) << 12) | ((e & 63) << 6) | (f & 63))-65536;
		out += String.fromCharCode(0xD800 + ((w>>>10)&1023));
		out += String.fromCharCode(0xDC00 + (w&1023));
	}
	return out;
}

function utf8readb(data) {
	var out = new_raw_buf(2*data.length), w, i, j = 1, k = 0, ww=0, c;
	for(i = 0; i < data.length; i+=j) {
		j = 1;
		if((c=data.charCodeAt(i)) < 128) w = c;
		else if(c < 224) { w = (c&31)*64+(data.charCodeAt(i+1)&63); j=2; }
		else if(c < 240) { w=(c&15)*4096+(data.charCodeAt(i+1)&63)*64+(data.charCodeAt(i+2)&63); j=3; }
		else { j = 4;
			w = (c & 7)*262144+(data.charCodeAt(i+1)&63)*4096+(data.charCodeAt(i+2)&63)*64+(data.charCodeAt(i+3)&63);
			w -= 65536; ww = 0xD800 + ((w>>>10)&1023); w = 0xDC00 + (w&1023);
		}
		if(ww !== 0) { out[k++] = ww&255; out[k++] = ww>>>8; ww = 0; }
		out[k++] = w%256; out[k++] = w>>>8;
	}
	return out.slice(0,k).toString('ucs2');
}

function utf8readc(data) { return Buffer_from(data, 'binary').toString('utf8'); }

var utf8corpus = "foo bar baz\u00e2\u0098\u0083\u00f0\u009f\u008d\u00a3";
var utf8read = has_buf && (/*#__PURE__*/utf8readc(utf8corpus) == /*#__PURE__*/utf8reada(utf8corpus) && utf8readc || /*#__PURE__*/utf8readb(utf8corpus) == /*#__PURE__*/utf8reada(utf8corpus) && utf8readb) || utf8reada;

var utf8write/*:StringConv*/ = has_buf ? function(data) { return Buffer_from(data, 'utf8').toString("binary"); } : function(orig/*:string*/)/*:string*/ {
	var out/*:Array<string>*/ = [], i = 0, c = 0, d = 0;
	while(i < orig.length) {
		c = orig.charCodeAt(i++);
		switch(true) {
			case c < 128: out.push(String.fromCharCode(c)); break;
			case c < 2048:
				out.push(String.fromCharCode(192 + (c >> 6)));
				out.push(String.fromCharCode(128 + (c & 63)));
				break;
			case c >= 55296 && c < 57344:
				c -= 55296; d = orig.charCodeAt(i++) - 56320 + (c<<10);
				out.push(String.fromCharCode(240 + ((d >>18) & 7)));
				out.push(String.fromCharCode(144 + ((d >>12) & 63)));
				out.push(String.fromCharCode(128 + ((d >> 6) & 63)));
				out.push(String.fromCharCode(128 + (d & 63)));
				break;
			default:
				out.push(String.fromCharCode(224 + (c >> 12)));
				out.push(String.fromCharCode(128 + ((c >> 6) & 63)));
				out.push(String.fromCharCode(128 + (c & 63)));
		}
	}
	return out.join("");
};

var htmldecode/*:{(s:string):string}*/ = /*#__PURE__*/(function() {
	var entities/*:Array<[RegExp, string]>*/ = [
		['nbsp', ' '], ['middot', '·'],
		['quot', '"'], ['apos', "'"], ['gt',   '>'], ['lt',   '<'], ['amp',  '&']
	].map(function(x/*:[string, string]*/) { return [new RegExp('&' + x[0] + ';', "ig"), x[1]]; });
	return function htmldecode(str/*:string*/)/*:string*/ {
		var o = str
				// Remove new lines and spaces from start of content
				.replace(/^[\t\n\r ]+/, "")
				// Remove new lines and spaces from end of content
				.replace(/(^|[^\t\n\r ])[\t\n\r ]+$/,"$1")
				// Added line which removes any white space characters after and before html tags
				.replace(/>\s+/g,">").replace(/\b\s+</g,"<")
				// Replace remaining new lines and spaces with space
				.replace(/[\t\n\r ]+/g, " ")
				// Replace <br> tags with new lines
				.replace(/<\s*[bB][rR]\s*\/?>/g,"\n")
				// Strip HTML elements
				.replace(/<[^<>]*>/g,"");
		for(var i = 0; i < entities.length; ++i) o = o.replace(entities[i][0], entities[i][1]);
		return o;
	};
})();

var vtvregex = /<\/?(?:vt:)?variant>/g, vtmregex = /<(?:vt:)([^<"'>]*)>([\s\S]*)</;
function parseVector(data/*:string*/, opts)/*:Array<{v:string,t:string}>*/ {
	var h = parsexmltag(data);

	var matches/*:Array<string>*/ = str_match_xml_ns_g(data, h.baseType)||[];
	var res/*:Array<any>*/ = [];
	if(matches.length != h.size) {
		if(opts.WTF) throw new Error("unexpected vector length " + matches.length + " != " + h.size);
		return res;
	}
	matches.forEach(function(x/*:string*/) {
		var v = x.replace(vtvregex,"").match(vtmregex);
		if(v) res.push({v:utf8read(v[2]), t:v[1]});
	});
	return res;
}

var wtregex = /(^\s|\s$|\n)/;
function writetag(f/*:string*/,g/*:string*/)/*:string*/ { return '<' + f + (g.match(wtregex)?' xml:space="preserve"' : "") + '>' + g + '</' + f + '>'; }

function wxt_helper(h)/*:string*/ { return keys(h).map(function(k) { return " " + k + '="' + h[k] + '"';}).join(""); }
function writextag(f/*:string*/,g/*:?string*/,h) { return '<' + f + ((h != null) ? wxt_helper(h) : "") + ((g != null) ? (g.match(wtregex)?' xml:space="preserve"' : "") + '>' + g + '</' + f : "/") + '>';}

function write_w3cdtf(d/*:Date*/, t/*:?boolean*/)/*:string*/ { try { return d.toISOString().replace(/\.\d*/,""); } catch(e) { if(t) throw e; } return ""; }

function write_vt(s, xlsx/*:?boolean*/)/*:string*/ {
	switch(typeof s) {
		case 'string':
			var o = writextag('vt:lpwstr', escapexml(s));
			if(xlsx) o = o.replace(/&quot;/g, "_x0022_");
			return o;
		case 'number': return writextag((s|0)==s?'vt:i4':'vt:r8', escapexml(String(s)));
		case 'boolean': return writextag('vt:bool',s?'true':'false');
	}
	if(s instanceof Date) return writextag('vt:filetime', write_w3cdtf(s));
	throw new Error("Unable to serialize " + s);
}

function xlml_normalize(d)/*:string*/ {
	if(has_buf &&/*::typeof Buffer !== "undefined" && d != null && d instanceof Buffer &&*/ Buffer.isBuffer(d)) return d.toString('utf8');
	if(typeof d === 'string') return d;
	/* duktape */
	if(typeof Uint8Array !== 'undefined' && d instanceof Uint8Array) return utf8read(a2s(ab2a(d)));
	throw new Error("Bad input format: expected Buffer or string");
}
/* UOS uses CJK in tags, ODS uses invalid XML */
var xlmlregex = /<([\/]?)([^\s?><!\/:"]*:|)([^\s?<>:\/"]+)(?:\s+[^<>=?"'\s]+="[^"]*?")*\s*[\/]?>/mg;

var XMLNS = ({
	CORE_PROPS: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
	CUST_PROPS: "http://schemas.openxmlformats.org/officeDocument/2006/custom-properties",
	EXT_PROPS: "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
	CT: 'http://schemas.openxmlformats.org/package/2006/content-types',
	RELS: 'http://schemas.openxmlformats.org/package/2006/relationships',
	TCMNT: 'http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments',
	'dc': 'http://purl.org/dc/elements/1.1/',
	'dcterms': 'http://purl.org/dc/terms/',
	'dcmitype': 'http://purl.org/dc/dcmitype/',
	'mx': 'http://schemas.microsoft.com/office/mac/excel/2008/main',
	'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
	'sjs': 'http://schemas.openxmlformats.org/package/2006/sheetjs/core-properties',
	'vt': 'http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes',
	'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
	'xsd': 'http://www.w3.org/2001/XMLSchema'
}/*:any*/);

var XMLNS_main = [
	'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
	'http://purl.oclc.org/ooxml/spreadsheetml/main',
	'http://schemas.microsoft.com/office/excel/2006/main',
	'http://schemas.microsoft.com/office/excel/2006/2'
];

var XLMLNS = ({
	'o':    'urn:schemas-microsoft-com:office:office',
	'x':    'urn:schemas-microsoft-com:office:excel',
	'ss':   'urn:schemas-microsoft-com:office:spreadsheet',
	'dt':   'uuid:C2F41010-65B3-11d1-A29F-00AA00C14882',
	'mv':   'http://macVmlSchemaUri',
	'v':    'urn:schemas-microsoft-com:vml',
	'html': 'http://www.w3.org/TR/REC-html40'
}/*:any*/);
function read_double_le(b/*:RawBytes|CFBlob*/, idx/*:number*/)/*:number*/ {
	var s = 1 - 2 * (b[idx + 7] >>> 7);
	var e = ((b[idx + 7] & 0x7f) << 4) + ((b[idx + 6] >>> 4) & 0x0f);
	var m = (b[idx+6]&0x0f);
	for(var i = 5; i >= 0; --i) m = m * 256 + b[idx + i];
	if(e == 0x7ff) return m == 0 ? (s * Infinity) : NaN;
	if(e == 0) e = -1022;
	else { e -= 1023; m += Math.pow(2,52); }
	return s * Math.pow(2, e - 52) * m;
}

function write_double_le(b/*:RawBytes|CFBlob*/, v/*:number*/, idx/*:number*/) {
	var bs = ((((v < 0) || (1/v == -Infinity)) ? 1 : 0) << 7), e = 0, m = 0;
	var av = bs ? (-v) : v;
	if(!isFinite(av)) { e = 0x7ff; m = isNaN(v) ? 0x6969 : 0; }
	else if(av == 0) e = m = 0;
	else {
		e = Math.floor(Math.log(av) / Math.LN2);
		m = av * Math.pow(2, 52 - e);
		if((e <= -1023) && (!isFinite(m) || (m < Math.pow(2,52)))) { e = -1022; }
		else { m -= Math.pow(2,52); e+=1023; }
	}
	for(var i = 0; i <= 5; ++i, m/=256) b[idx + i] = m & 0xff;
	b[idx + 6] = ((e & 0x0f) << 4) | (m & 0xf);
	b[idx + 7] = (e >> 4) | bs;
}

var ___toBuffer = function(bufs/*:Array<Array<RawBytes> >*/)/*:RawBytes*/ { var x=[],w=10240; for(var i=0;i<bufs[0].length;++i) if(bufs[0][i]) for(var j=0,L=bufs[0][i].length;j<L;j+=w) x.push.apply(x, bufs[0][i].slice(j,j+w)); return x; };
var __toBuffer = has_buf ? function(bufs) { return (bufs[0].length > 0 && Buffer.isBuffer(bufs[0][0])) ? Buffer.concat(bufs[0].map(function(x) { return Buffer.isBuffer(x) ? x : Buffer_from(x); })) : ___toBuffer(bufs);} : ___toBuffer;

var ___utf16le = function(b/*:RawBytes|CFBlob*/,s/*:number*/,e/*:number*/)/*:string*/ { var ss/*:Array<string>*/=[]; for(var i=s; i<e; i+=2) ss.push(String.fromCharCode(__readUInt16LE(b,i))); return ss.join("").replace(chr0,''); };
var __utf16le = has_buf ? function(b/*:RawBytes|CFBlob*/,s/*:number*/,e/*:number*/)/*:string*/ { if(!Buffer.isBuffer(b)/*:: || !(b instanceof Buffer)*/ || !buf_utf16le) return ___utf16le(b,s,e); return b.toString('utf16le',s,e).replace(chr0,'')/*.replace(chr1,'!')*/; } : ___utf16le;

var ___hexlify = function(b/*:RawBytes|CFBlob*/,s/*:number*/,l/*:number*/)/*:string*/ { var ss/*:Array<string>*/=[]; for(var i=s; i<s+l; ++i) ss.push(("0" + b[i].toString(16)).slice(-2)); return ss.join(""); };
var __hexlify = has_buf ? function(b/*:RawBytes|CFBlob*/,s/*:number*/,l/*:number*/)/*:string*/ { return Buffer.isBuffer(b)/*:: && b instanceof Buffer*/ ? b.toString('hex',s,s+l) : ___hexlify(b,s,l); } : ___hexlify;

var ___utf8 = function(b/*:RawBytes|CFBlob*/,s/*:number*/,e/*:number*/) { var ss=[]; for(var i=s; i<e; i++) ss.push(String.fromCharCode(__readUInt8(b,i))); return ss.join(""); };
var __utf8 = has_buf ? function utf8_b(b/*:RawBytes|CFBlob*/, s/*:number*/, e/*:number*/) { return (Buffer.isBuffer(b)/*:: && (b instanceof Buffer)*/) ? b.toString('utf8',s,e) : ___utf8(b,s,e); } : ___utf8;

var ___lpstr = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len-1) : "";};
var __lpstr = ___lpstr;

var ___cpstr = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len-1) : "";};
var __cpstr = ___cpstr;

var ___lpwstr = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = 2*__readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len-1) : "";};
var __lpwstr = ___lpwstr;

var ___lpp4 = function lpp4_(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? __utf16le(b, i+4,i+4+len) : "";};
var __lpp4 = ___lpp4;

var ___8lpp4 = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? __utf8(b, i+4,i+4+len) : "";};
var __8lpp4 = ___8lpp4;

var ___double = function(b/*:RawBytes|CFBlob*/, idx/*:number*/) { return read_double_le(b, idx);};
var __double = ___double;

var is_buf = function is_buf_a(a) { return Array.isArray(a) || (typeof Uint8Array !== "undefined" && a instanceof Uint8Array); };

if(has_buf/*:: && typeof Buffer !== 'undefined'*/) {
	__lpstr = function lpstr_b(b/*:RawBytes|CFBlob*/, i/*:number*/) { if(!Buffer.isBuffer(b)/*:: || !(b instanceof Buffer)*/) return ___lpstr(b, i); var len = b.readUInt32LE(i); return len > 0 ? b.toString('utf8',i+4,i+4+len-1) : "";};
	__cpstr = function cpstr_b(b/*:RawBytes|CFBlob*/, i/*:number*/) { if(!Buffer.isBuffer(b)/*:: || !(b instanceof Buffer)*/) return ___cpstr(b, i); var len = b.readUInt32LE(i); return len > 0 ? b.toString('utf8',i+4,i+4+len-1) : "";};
	__lpwstr = function lpwstr_b(b/*:RawBytes|CFBlob*/, i/*:number*/) { if(!Buffer.isBuffer(b)/*:: || !(b instanceof Buffer)*/ || !buf_utf16le) return ___lpwstr(b, i); var len = 2*b.readUInt32LE(i); return b.toString('utf16le',i+4,i+4+len-1);};
	__lpp4 = function lpp4_b(b/*:RawBytes|CFBlob*/, i/*:number*/) { if(!Buffer.isBuffer(b)/*:: || !(b instanceof Buffer)*/ || !buf_utf16le) return ___lpp4(b, i); var len = b.readUInt32LE(i); return b.toString('utf16le',i+4,i+4+len);};
	__8lpp4 = function lpp4_8b(b/*:RawBytes|CFBlob*/, i/*:number*/) { if(!Buffer.isBuffer(b)/*:: || !(b instanceof Buffer)*/) return ___8lpp4(b, i); var len = b.readUInt32LE(i); return b.toString('utf8',i+4,i+4+len);};
	__double = function double_(b/*:RawBytes|CFBlob*/, i/*:number*/) { if(Buffer.isBuffer(b)/*::&& b instanceof Buffer*/) return b.readDoubleLE(i); return ___double(b,i); };
	is_buf = function is_buf_b(a) { return Buffer.isBuffer(a) || Array.isArray(a) || (typeof Uint8Array !== "undefined" && a instanceof Uint8Array); };
}

/* from js-xls */
function cpdoit() {
	__utf16le = function(b/*:RawBytes|CFBlob*/,s/*:number*/,e/*:number*/) { return $cptable.utils.decode(1200, b.slice(s,e)).replace(chr0, ''); };
	__utf8 = function(b/*:RawBytes|CFBlob*/,s/*:number*/,e/*:number*/) { return $cptable.utils.decode(65001, b.slice(s,e)); };
	__lpstr = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? $cptable.utils.decode(current_ansi, b.slice(i+4, i+4+len-1)) : "";};
	__cpstr = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? $cptable.utils.decode(current_codepage, b.slice(i+4, i+4+len-1)) : "";};
	__lpwstr = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = 2*__readUInt32LE(b,i); return len > 0 ? $cptable.utils.decode(1200, b.slice(i+4,i+4+len-1)) : "";};
	__lpp4 = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? $cptable.utils.decode(1200, b.slice(i+4,i+4+len)) : "";};
	__8lpp4 = function(b/*:RawBytes|CFBlob*/,i/*:number*/) { var len = __readUInt32LE(b,i); return len > 0 ? $cptable.utils.decode(65001, b.slice(i+4,i+4+len)) : "";};
}
if(typeof $cptable !== 'undefined') cpdoit();

var __readUInt8 = function(b/*:RawBytes|CFBlob*/, idx/*:number*/)/*:number*/ { return b[idx]; };
var __readUInt16LE = function(b/*:RawBytes|CFBlob*/, idx/*:number*/)/*:number*/ { return (b[idx+1]*(1<<8))+b[idx]; };
var __readInt16LE = function(b/*:RawBytes|CFBlob*/, idx/*:number*/)/*:number*/ { var u = (b[idx+1]*(1<<8))+b[idx]; return (u < 0x8000) ? u : ((0xffff - u + 1) * -1); };
var __readUInt32LE = function(b/*:RawBytes|CFBlob*/, idx/*:number*/)/*:number*/ { return b[idx+3]*(1<<24)+(b[idx+2]<<16)+(b[idx+1]<<8)+b[idx]; };
var __readInt32LE = function(b/*:RawBytes|CFBlob*/, idx/*:number*/)/*:number*/ { return (b[idx+3]<<24)|(b[idx+2]<<16)|(b[idx+1]<<8)|b[idx]; };
var __readInt32BE = function(b/*:RawBytes|CFBlob*/, idx/*:number*/)/*:number*/ { return (b[idx]<<24)|(b[idx+1]<<16)|(b[idx+2]<<8)|b[idx+3]; };

function ReadShift(size/*:number*/, t/*:?string*/)/*:number|string*/ {
	var o="", oI/*:: :number = 0*/, oR, oo=[], w, vv, i, loc;
	switch(t) {
		case 'dbcs':
			loc = this.l;
			if(has_buf && Buffer.isBuffer(this)  && buf_utf16le) o = this.slice(this.l, this.l+2*size).toString("utf16le");
			else for(i = 0; i < size; ++i) { o+=String.fromCharCode(__readUInt16LE(this, loc)); loc+=2; }
			size *= 2;
			break;

		case 'utf8': o = __utf8(this, this.l, this.l + size); break;
		case 'utf16le': size *= 2; o = __utf16le(this, this.l, this.l + size); break;

		case 'wstr':
			if(typeof $cptable !== 'undefined') o = $cptable.utils.decode(current_codepage, this.slice(this.l, this.l+2*size));
			else return ReadShift.call(this, size, 'dbcs');
			size = 2 * size; break;

		/* [MS-OLEDS] 2.1.4 LengthPrefixedAnsiString */
		case 'lpstr-ansi': o = __lpstr(this, this.l); size = 4 + __readUInt32LE(this, this.l); break;
		case 'lpstr-cp': o = __cpstr(this, this.l); size = 4 + __readUInt32LE(this, this.l); break;
		/* [MS-OLEDS] 2.1.5 LengthPrefixedUnicodeString */
		case 'lpwstr': o = __lpwstr(this, this.l); size = 4 + 2 * __readUInt32LE(this, this.l); break;
		/* [MS-OFFCRYPTO] 2.1.2 Length-Prefixed Padded Unicode String (UNICODE-LP-P4) */
		case 'lpp4': size = 4 +  __readUInt32LE(this, this.l); o = __lpp4(this, this.l); if(size & 0x02) size += 2; break;
		/* [MS-OFFCRYPTO] 2.1.3 Length-Prefixed UTF-8 String (UTF-8-LP-P4) */
		case '8lpp4': size = 4 +  __readUInt32LE(this, this.l); o = __8lpp4(this, this.l); if(size & 0x03) size += 4 - (size & 0x03); break;

		case 'cstr': size = 0; o = "";
			while((w=__readUInt8(this, this.l + size++))!==0) oo.push(_getchar(w));
			o = oo.join(""); break;
		case '_wstr': size = 0; o = "";
			while((w=__readUInt16LE(this,this.l +size))!==0){oo.push(_getchar(w));size+=2;}
			size+=2; o = oo.join(""); break;

		/* sbcs and dbcs support continue records in the SST way TODO codepages */
		case 'dbcs-cont': o = ""; loc = this.l;
			for(i = 0; i < size; ++i) {
				if(this.lens && this.lens.indexOf(loc) !== -1) {
					w = __readUInt8(this, loc);
					this.l = loc + 1;
					vv = ReadShift.call(this, size-i, w ? 'dbcs-cont' : 'sbcs-cont');
					return oo.join("") + vv;
				}
				oo.push(_getchar(__readUInt16LE(this, loc)));
				loc+=2;
			} o = oo.join(""); size *= 2; break;

		case 'cpstr':
			if(typeof $cptable !== 'undefined') {
				o = $cptable.utils.decode(current_codepage, this.slice(this.l, this.l + size));
				break;
			}
		/* falls through */
		case 'sbcs-cont': o = ""; loc = this.l;
			for(i = 0; i != size; ++i) {
				if(this.lens && this.lens.indexOf(loc) !== -1) {
					w = __readUInt8(this, loc);
					this.l = loc + 1;
					vv = ReadShift.call(this, size-i, w ? 'dbcs-cont' : 'sbcs-cont');
					return oo.join("") + vv;
				}
				oo.push(_getchar(__readUInt8(this, loc)));
				loc+=1;
			} o = oo.join(""); break;

		default:
	switch(size) {
		case 1: oI = __readUInt8(this, this.l); this.l++; return oI;
		case 2: oI = (t === 'i' ? __readInt16LE : __readUInt16LE)(this, this.l); this.l += 2; return oI;
		case 4: case -4:
			if(t === 'i' || ((this[this.l+3] & 0x80)===0)) { oI = ((size > 0) ? __readInt32LE : __readInt32BE)(this, this.l); this.l += 4; return oI; }
			else { oR = __readUInt32LE(this, this.l); this.l += 4; } return oR;
		case 8: case -8:
			if(t === 'f') {
				if(size == 8) oR = __double(this, this.l);
				else oR = __double([this[this.l+7],this[this.l+6],this[this.l+5],this[this.l+4],this[this.l+3],this[this.l+2],this[this.l+1],this[this.l+0]], 0);
				this.l += 8; return oR;
			} else size = 8;
		/* falls through */
		case 16: o = __hexlify(this, this.l, size); break;
	}}
	this.l+=size; return o;
}

var __writeUInt32LE = function(b/*:RawBytes|CFBlob*/, val/*:number*/, idx/*:number*/)/*:void*/ { b[idx] = (val & 0xFF); b[idx+1] = ((val >>> 8) & 0xFF); b[idx+2] = ((val >>> 16) & 0xFF); b[idx+3] = ((val >>> 24) & 0xFF); };
var __writeInt32LE  = function(b/*:RawBytes|CFBlob*/, val/*:number*/, idx/*:number*/)/*:void*/ { b[idx] = (val & 0xFF); b[idx+1] = ((val >> 8) & 0xFF); b[idx+2] = ((val >> 16) & 0xFF); b[idx+3] = ((val >> 24) & 0xFF); };
var __writeUInt16LE = function(b/*:RawBytes|CFBlob*/, val/*:number*/, idx/*:number*/)/*:void*/ { b[idx] = (val & 0xFF); b[idx+1] = ((val >>> 8) & 0xFF); };

function WriteShift(t/*:number*/, val/*:string|number*/, f/*:?string*/)/*:any*/ {
	var size = 0, i = 0;
	if(f === 'dbcs') {
		/*:: if(typeof val !== 'string') throw new Error("unreachable"); */
		for(i = 0; i != val.length; ++i) __writeUInt16LE(this, val.charCodeAt(i), this.l + 2 * i);
		size = 2 * val.length;
	} else if(f === 'sbcs' || f == 'cpstr') {
		if(typeof $cptable !== 'undefined' && current_ansi == 874) {
			/* TODO: use tables directly, don't encode */
			/*:: if(typeof val !== "string") throw new Error("unreachable"); */
			for(i = 0; i != val.length; ++i) {
				var cpp = $cptable.utils.encode(current_ansi, val.charAt(i));
				this[this.l + i] = cpp[0];
			}
			size = val.length;
		} else if(typeof $cptable !== 'undefined' && f == 'cpstr') {
			cpp = $cptable.utils.encode(current_codepage, val);
			/* replace null bytes with _ when relevant */
      if(cpp.length == val.length) for(i = 0; i < val.length; ++i) if(cpp[i] == 0 && val.charCodeAt(i) != 0) cpp[i] = 0x5F;
      if(cpp.length == 2 * val.length) for(i = 0; i < val.length; ++i) if(cpp[2*i] == 0 && cpp[2*i+1] == 0 && val.charCodeAt(i) != 0) cpp[2*i] = 0x5F;
			for(i = 0; i < cpp.length; ++i) this[this.l + i] = cpp[i];
			size = cpp.length;
		} else {
			/*:: if(typeof val !== 'string') throw new Error("unreachable"); */
			val = val.replace(/[^\x00-\x7F]/g, "_");
			/*:: if(typeof val !== 'string') throw new Error("unreachable"); */
			for(i = 0; i != val.length; ++i) this[this.l + i] = (val.charCodeAt(i) & 0xFF);
			size = val.length;
		}
	} else if(f === 'hex') {
		for(; i < t; ++i) {
			/*:: if(typeof val !== "string") throw new Error("unreachable"); */
			this[this.l++] = (parseInt(val.slice(2*i, 2*i+2), 16)||0);
		} return this;
	} else if(f === 'utf16le') {
			/*:: if(typeof val !== "string") throw new Error("unreachable"); */
			var end/*:number*/ = Math.min(this.l + t, this.length);
			for(i = 0; i < Math.min(val.length, t); ++i) {
				var cc = val.charCodeAt(i);
				this[this.l++] = (cc & 0xff);
				this[this.l++] = (cc >> 8);
			}
			while(this.l < end) this[this.l++] = 0;
			return this;
	} else /*:: if(typeof val === 'number') */ switch(t) {
		case  1: size = 1; this[this.l] = val&0xFF; break;
		case  2: size = 2; this[this.l] = val&0xFF; val >>>= 8; this[this.l+1] = val&0xFF; break;
		case  3: size = 3; this[this.l] = val&0xFF; val >>>= 8; this[this.l+1] = val&0xFF; val >>>= 8; this[this.l+2] = val&0xFF; break;
		case  4: size = 4; __writeUInt32LE(this, val, this.l); break;
		case  8: size = 8; if(f === 'f') { write_double_le(this, val, this.l); break; }
		/* falls through */
		case 16: break;
		case -4: size = 4; __writeInt32LE(this, val, this.l); break;
	}
	this.l += size; return this;
}

function CheckField(hexstr/*:string*/, fld/*:string*/)/*:void*/ {
	var m = __hexlify(this,this.l,hexstr.length>>1);
	if(m !== hexstr) throw new Error(fld + 'Expected ' + hexstr + ' saw ' + m);
	this.l += hexstr.length>>1;
}

function prep_blob(blob, pos/*:number*/)/*:void*/ {
	blob.l = pos;
	blob.read_shift = /*::(*/ReadShift/*:: :any)*/;
	blob.chk = CheckField;
	blob.write_shift = WriteShift;
}

function parsenoop(blob, length/*:: :number, opts?:any */) { blob.l += length; }

function new_buf(sz/*:number*/)/*:Block*/ {
	var o = new_raw_buf(sz);
	prep_blob(o, 0);
	return o;
}

/* [MS-XLSB] 2.1.4 Record */
function recordhopper(data, cb/*:RecordHopperCB*/, opts/*:?any*/) {
	if(!data) return;
	var tmpbyte, cntbyte, length;
	prep_blob(data, data.l || 0);
	var L = data.length, RT = 0, tgt = 0;
	while(data.l < L) {
		RT = data.read_shift(1);
		if(RT & 0x80) RT = (RT & 0x7F) + ((data.read_shift(1) & 0x7F)<<7);
		var R = XLSBRecordEnum[RT] || XLSBRecordEnum[0xFFFF];
		tmpbyte = data.read_shift(1);
		length = tmpbyte & 0x7F;
		for(cntbyte = 1; cntbyte <4 && (tmpbyte & 0x80); ++cntbyte) length += ((tmpbyte = data.read_shift(1)) & 0x7F)<<(7*cntbyte);
		tgt = data.l + length;
		var d = R.f && R.f(data, length, opts);
		data.l = tgt;
		if(cb(d, R, RT)) return;
	}
}

/* control buffer usage for fixed-length buffers */
function buf_array()/*:BufArray*/ {
	var bufs/*:Array<Block>*/ = [], blksz = has_buf ? 256 : 2048;
	var newblk = function ba_newblk(sz/*:number*/)/*:Block*/ {
		var o/*:Block*/ = (new_buf(sz)/*:any*/);
		prep_blob(o, 0);
		return o;
	};

	var curbuf/*:Block*/ = newblk(blksz);

	var endbuf = function ba_endbuf() {
		if(!curbuf) return;
		// workaround for new Buffer(3).slice(0,0) bug in bun 0.1.3
		if(curbuf.l) {
			if(curbuf.length > curbuf.l) { curbuf = curbuf.slice(0, curbuf.l); curbuf.l = curbuf.length; }
			if(curbuf.length > 0) bufs.push(curbuf);
		}
		curbuf = null;
	};

	var next = function ba_next(sz/*:number*/)/*:Block*/ {
		if(curbuf && (sz < (curbuf.length - curbuf.l))) return curbuf;
		endbuf();
		return (curbuf = newblk(Math.max(sz+1, blksz)));
	};

	var end = function ba_end() {
		endbuf();
		return bconcat(bufs);
	};

	var push = function ba_push(buf) { endbuf(); curbuf = buf; if(curbuf.l == null) curbuf.l = curbuf.length; next(blksz); };

	return ({ next:next, push:push, end:end, _bufs:bufs }/*:any*/);
}

function write_record(ba/*:BufArray*/, type/*:number*/, payload, length/*:?number*/) {
	var t/*:number*/ = +type, l;
	if(isNaN(t)) return; // TODO: throw something here?
	if(!length) length = XLSBRecordEnum[t].p || (payload||[]).length || 0;
	l = 1 + (t >= 0x80 ? 1 : 0) + 1/* + length*/;
	if(length >= 0x80) ++l; if(length >= 0x4000) ++l; if(length >= 0x200000) ++l;
	var o = ba.next(l);
	if(t <= 0x7F) o.write_shift(1, t);
	else {
		o.write_shift(1, (t & 0x7F) + 0x80);
		o.write_shift(1, (t >> 7));
	}
	for(var i = 0; i != 4; ++i) {
		if(length >= 0x80) { o.write_shift(1, (length & 0x7F)+0x80); length >>= 7; }
		else { o.write_shift(1, length); break; }
	}
	if(/*:: length != null &&*/length > 0 && is_buf(payload)) ba.push(payload);
}
/* XLS ranges enforced */
function shift_cell_xls(cell/*:CellAddress*/, tgt/*:any*/, opts/*:?any*/)/*:CellAddress*/ {
	var out = dup(cell);
	if(tgt.s) {
		if(out.cRel) out.c += tgt.s.c;
		if(out.rRel) out.r += tgt.s.r;
	} else {
		if(out.cRel) out.c += tgt.c;
		if(out.rRel) out.r += tgt.r;
	}
	if(!opts || opts.biff < 12) {
		while(out.c >= 0x100) out.c -= 0x100;
		while(out.r >= 0x10000) out.r -= 0x10000;
	}
	return out;
}

function shift_range_xls(cell, range, opts) {
	var out = dup(cell);
	out.s = shift_cell_xls(out.s, range.s, opts);
	out.e = shift_cell_xls(out.e, range.s, opts);
	return out;
}

function encode_cell_xls(c/*:CellAddress*/, biff/*:number*/)/*:string*/ {
	if(c.cRel && c.c < 0) { c = dup(c); while(c.c < 0) c.c += (biff > 8) ? 0x4000 : 0x100; }
	if(c.rRel && c.r < 0) { c = dup(c); while(c.r < 0) c.r += (biff > 8) ? 0x100000 : ((biff > 5) ? 0x10000 : 0x4000); }
	var s = encode_cell(c);
	if(!c.cRel && c.cRel != null) s = fix_col(s);
	if(!c.rRel && c.rRel != null) s = fix_row(s);
	return s;
}

function encode_range_xls(r, opts)/*:string*/ {
	if(r.s.r == 0 && !r.s.rRel) {
		if(r.e.r == (opts.biff >= 12 ? 0xFFFFF : (opts.biff >= 8 ? 0x10000 : 0x4000)) && !r.e.rRel) {
			return (r.s.cRel ? "" : "$") + encode_col(r.s.c) + ":" + (r.e.cRel ? "" : "$") + encode_col(r.e.c);
		}
	}
	if(r.s.c == 0 && !r.s.cRel) {
		if(r.e.c == (opts.biff >= 12 ? 0x3FFF : 0xFF) && !r.e.cRel) {
			return (r.s.rRel ? "" : "$") + encode_row(r.s.r) + ":" + (r.e.rRel ? "" : "$") + encode_row(r.e.r);
		}
	}
	return encode_cell_xls(r.s, opts.biff) + ":" + encode_cell_xls(r.e, opts.biff);
}
function decode_row(rowstr/*:string*/)/*:number*/ { return parseInt(unfix_row(rowstr),10) - 1; }
function encode_row(row/*:number*/)/*:string*/ { return "" + (row + 1); }
function fix_row(cstr/*:string*/)/*:string*/ { return cstr.replace(/([A-Z]|^)(\d+)$/,"$1$$$2"); }
function unfix_row(cstr/*:string*/)/*:string*/ { return cstr.replace(/\$(\d+)$/,"$1"); }

function decode_col(colstr/*:string*/)/*:number*/ { var c = unfix_col(colstr), d = 0, i = 0; for(; i !== c.length; ++i) d = 26*d + c.charCodeAt(i) - 64; return d - 1; }
function encode_col(col/*:number*/)/*:string*/ { if(col < 0) throw new Error("invalid column " + col); var s=""; for(++col; col; col=Math.floor((col-1)/26)) s = String.fromCharCode(((col-1)%26) + 65) + s; return s; }
function fix_col(cstr/*:string*/)/*:string*/ { return cstr.replace(/^([A-Z])/,"$$$1"); }
function unfix_col(cstr/*:string*/)/*:string*/ { return cstr.replace(/^\$([A-Z])/,"$1"); }

function split_cell(cstr/*:string*/)/*:Array<string>*/ { return cstr.replace(/(\$?[A-Z]*)(\$?\d*)/,"$1,$2").split(","); }
function decode_cell(cstr/*:string*/)/*:CellAddress*/ {
	var R = 0, C = 0;
	for(var i = 0; i < cstr.length; ++i) {
		var cc = cstr.charCodeAt(i);
		if(cc >= 48 && cc <= 57) R = 10 * R + (cc - 48);
		else if(cc >= 65 && cc <= 90) C = 26 * C + (cc - 64);
	}
	return { c: C - 1, r:R - 1 };
}
function encode_cell(cell/*:CellAddress*/)/*:string*/ {
	var col = cell.c + 1;
	var s="";
	for(; col; col=((col-1)/26)|0) s = String.fromCharCode(((col-1)%26) + 65) + s;
	return s + (cell.r + 1);
}
function decode_range(range/*:string*/)/*:Range*/ {
	var idx = range.indexOf(":");
	if(idx == -1) return { s: decode_cell(range), e: decode_cell(range) };
	return { s: decode_cell(range.slice(0, idx)), e: decode_cell(range.slice(idx + 1)) };
}
/*# if only one arg, it is assumed to be a Range.  If 2 args, both are cell addresses */
function encode_range(cs/*:CellAddrSpec|Range*/,ce/*:?CellAddrSpec*/)/*:string*/ {
	if(typeof ce === 'undefined' || typeof ce === 'number') {
/*:: if(!(cs instanceof Range)) throw "unreachable"; */
		return encode_range(cs.s, cs.e);
	}
/*:: if((cs instanceof Range)) throw "unreachable"; */
	if(typeof cs !== 'string') cs = encode_cell((cs/*:any*/));
	if(typeof ce !== 'string') ce = encode_cell((ce/*:any*/));
/*:: if(typeof cs !== 'string') throw "unreachable"; */
/*:: if(typeof ce !== 'string') throw "unreachable"; */
	return cs == ce ? cs : cs + ":" + ce;
}
function fix_range(a1/*:string*/)/*:string*/ {
	var s = decode_range(a1);
	return "$" + encode_col(s.s.c) + "$" + encode_row(s.s.r) + ":$" + encode_col(s.e.c) + "$" + encode_row(s.e.r);
}

// List of invalid characters needs to be tested further
function formula_quote_sheet_name(sname/*:string*/, opts)/*:string*/ {
	if(!sname && !(opts && opts.biff <= 5 && opts.biff >= 2)) throw new Error("empty sheet name");
	if (/[^\w\u4E00-\u9FFF\u3040-\u30FF]/.test(sname)) return "'" + sname.replace(/'/g, "''") + "'";
	return sname;
}

function safe_decode_range(range/*:string*/)/*:Range*/ {
	var o = {s:{c:0,r:0},e:{c:0,r:0}};
	var idx = 0, i = 0, cc = 0;
	var len = range.length;
	for(idx = 0; i < len; ++i) {
		if((cc=range.charCodeAt(i)-64) < 1 || cc > 26) break;
		idx = 26*idx + cc;
	}
	o.s.c = --idx;

	for(idx = 0; i < len; ++i) {
		if((cc=range.charCodeAt(i)-48) < 0 || cc > 9) break;
		idx = 10*idx + cc;
	}
	o.s.r = --idx;

	if(i === len || cc != 10) { o.e.c=o.s.c; o.e.r=o.s.r; return o; }
	++i;

	for(idx = 0; i != len; ++i) {
		if((cc=range.charCodeAt(i)-64) < 1 || cc > 26) break;
		idx = 26*idx + cc;
	}
	o.e.c = --idx;

	for(idx = 0; i != len; ++i) {
		if((cc=range.charCodeAt(i)-48) < 0 || cc > 9) break;
		idx = 10*idx + cc;
	}
	o.e.r = --idx;
	return o;
}

function safe_format_cell(cell/*:Cell*/, v/*:any*/) {
	var q = (cell.t == 'd' && v instanceof Date);
	if(cell.z != null) try { return (cell.w = SSF_format(cell.z, q ? datenum(v) : v)); } catch(e) { }
	try { return (cell.w = SSF_format((cell.XF||{}).numFmtId||(q ? 14 : 0),  q ? datenum(v) : v)); } catch(e) { return ''+v; }
}

function format_cell(cell/*:Cell*/, v/*:any*/, o/*:any*/) {
	if(cell == null || cell.t == null || cell.t == 'z') return "";
	if(cell.w !== undefined) return cell.w;
	if(cell.t == 'd' && !cell.z && o && o.dateNF) cell.z = o.dateNF;
	if(cell.t == "e") return BErr[cell.v] || cell.v;
	if(v == undefined) return safe_format_cell(cell, cell.v);
	return safe_format_cell(cell, v);
}

function sheet_to_workbook(sheet/*:Worksheet*/, opts)/*:Workbook*/ {
	var n = opts && opts.sheet ? opts.sheet : "Sheet1";
	var sheets = {}; sheets[n] = sheet;
	return { SheetNames: [n], Sheets: sheets };
}

function sheet_new(opts) {
	var out = {};
	var o = opts || {};
	if(o.dense) out["!data"] = [];
	return out;
}

function sheet_add_aoa(_ws/*:?Worksheet*/, data/*:AOA*/, opts/*:?any*/)/*:Worksheet*/ {
	var o = opts || {};
	var dense = _ws ? (_ws["!data"] != null) : o.dense;
	if(DENSE != null && dense == null) dense = DENSE;
	var ws/*:Worksheet*/ = _ws || ({}/*:any*/);
	if(dense && !ws["!data"]) ws["!data"] = [];
	var _R = 0, _C = 0;
	if(ws && o.origin != null) {
		if(typeof o.origin == 'number') _R = o.origin;
		else {
			var _origin/*:CellAddress*/ = typeof o.origin == "string" ? decode_cell(o.origin) : o.origin;
			_R = _origin.r; _C = _origin.c;
		}
	}
	var range/*:Range*/ = ({s: {c:10000000, r:10000000}, e: {c:0, r:0}}/*:any*/);
	if(ws["!ref"]){
		var _range = safe_decode_range(ws['!ref']);
		range.s.c = _range.s.c;
		range.s.r = _range.s.r;
		range.e.c = Math.max(range.e.c, _range.e.c);
		range.e.r = Math.max(range.e.r, _range.e.r);
		if(_R == -1) range.e.r = _R = (ws["!ref"] ? _range.e.r + 1 : 0);
	} else {
		range.s.c = range.e.c = range.s.r = range.e.r = 0;
	}
	var row = [], seen = false;
	for(var R = 0; R != data.length; ++R) {
		if(!data[R]) continue;
		if(!Array.isArray(data[R])) throw new Error("aoa_to_sheet expects an array of arrays");
		var __R = _R + R, __Rstr = "" + (__R + 1);
		//console.log("!!", R, _R, __R);
		if(dense) {
			if(!ws["!data"][__R]) ws["!data"][__R] = [];
			row = ws["!data"][__R];
		}
		for(var C = 0; C != data[R].length; ++C) {
			if(typeof data[R][C] === 'undefined') continue;
			var cell/*:Cell*/ = ({v: data[R][C] }/*:any*/);
			var __C = _C + C;
			if(range.s.r > __R) range.s.r = __R;
			if(range.s.c > __C) range.s.c = __C;
			if(range.e.r < __R) range.e.r = __R;
			if(range.e.c < __C) range.e.c = __C;
			seen = true;
			if(data[R][C] && typeof data[R][C] === 'object' && !Array.isArray(data[R][C]) && !(data[R][C] instanceof Date)) cell = data[R][C];
			else {
				if(Array.isArray(cell.v)) { cell.f = data[R][C][1]; cell.v = cell.v[0]; }
				if(cell.v === null) {
					if(cell.f) cell.t = 'n';
					else if(o.nullError) { cell.t = 'e'; cell.v = 0; }
					else if(!o.sheetStubs) continue;
					else cell.t = 'z';
				}
				else if(typeof cell.v === 'number') cell.t = 'n';
				else if(typeof cell.v === 'boolean') cell.t = 'b';
				else if(cell.v instanceof Date) {
					cell.z = o.dateNF || table_fmt[14];
					if(!o.UTC) cell.v = local_to_utc(cell.v);
					if(o.cellDates) { cell.t = 'd'; cell.w = SSF_format(cell.z, datenum(cell.v, o.date1904)); }
					else { cell.t = 'n'; cell.v = datenum(cell.v, o.date1904); cell.w = SSF_format(cell.z, cell.v); }
				}
				else cell.t = 's';
			}
			if(dense) {
				if(row[__C] && row[__C].z) cell.z = row[__C].z;
				row[__C] = cell;
			} else {
				var cell_ref = encode_col(__C) + __Rstr/*:any*/;
				if(ws[cell_ref] && ws[cell_ref].z) cell.z = ws[cell_ref].z;
				ws[cell_ref] = cell;
			}
		}
	}
	if(seen && range.s.c < 10400000) ws['!ref'] = encode_range(range);
	return ws;
}
function aoa_to_sheet(data/*:AOA*/, opts/*:?any*/)/*:Worksheet*/ { return sheet_add_aoa(null, data, opts); }

/* [MS-OLEPS] 2.2 PropertyType */
// Note: some tree shakers cannot handle VT_VECTOR | $CONST, hence extra vars
//var VT_EMPTY    = 0x0000;
//var VT_NULL     = 0x0001;
var VT_I2       = 0x0002;
var VT_I4       = 0x0003;
//var VT_R4       = 0x0004;
//var VT_R8       = 0x0005;
//var VT_CY       = 0x0006;
//var VT_DATE     = 0x0007;
//var VT_BSTR     = 0x0008;
//var VT_ERROR    = 0x000A;
var VT_BOOL     = 0x000B;
var VT_VARIANT  = 0x000C;
//var VT_DECIMAL  = 0x000E;
//var VT_I1       = 0x0010;
//var VT_UI1      = 0x0011;
//var VT_UI2      = 0x0012;
var VT_UI4      = 0x0013;
//var VT_I8       = 0x0014;
//var VT_UI8      = 0x0015;
//var VT_INT      = 0x0016;
//var VT_UINT     = 0x0017;
//var VT_LPSTR    = 0x001E;
//var VT_LPWSTR   = 0x001F;
var VT_FILETIME = 0x0040;
var VT_BLOB     = 0x0041;
//var VT_STREAM   = 0x0042;
//var VT_STORAGE  = 0x0043;
//var VT_STREAMED_Object  = 0x0044;
//var VT_STORED_Object    = 0x0045;
//var VT_BLOB_Object      = 0x0046;
var VT_CF       = 0x0047;
//var VT_CLSID    = 0x0048;
//var VT_VERSIONED_STREAM = 0x0049;
//var VT_VECTOR   = 0x1000;
var VT_VECTOR_VARIANT = 0x100C;
var VT_VECTOR_LPSTR   = 0x101E;
//var VT_ARRAY    = 0x2000;

var VT_STRING   = 0x0050; // 2.3.3.1.11 VtString
var VT_USTR     = 0x0051; // 2.3.3.1.12 VtUnalignedString
var VT_CUSTOM   = [VT_STRING, VT_USTR];

/* [MS-OSHARED] 2.3.3.2.2.1 Document Summary Information PIDDSI */
var DocSummaryPIDDSI = {
	0x01: { n: 'CodePage', t: VT_I2 },
	0x02: { n: 'Category', t: VT_STRING },
	0x03: { n: 'PresentationFormat', t: VT_STRING },
	0x04: { n: 'ByteCount', t: VT_I4 },
	0x05: { n: 'LineCount', t: VT_I4 },
	0x06: { n: 'ParagraphCount', t: VT_I4 },
	0x07: { n: 'SlideCount', t: VT_I4 },
	0x08: { n: 'NoteCount', t: VT_I4 },
	0x09: { n: 'HiddenCount', t: VT_I4 },
	0x0a: { n: 'MultimediaClipCount', t: VT_I4 },
	0x0b: { n: 'ScaleCrop', t: VT_BOOL },
	0x0c: { n: 'HeadingPairs', t: VT_VECTOR_VARIANT /* VT_VECTOR | VT_VARIANT */ },
	0x0d: { n: 'TitlesOfParts', t: VT_VECTOR_LPSTR /* VT_VECTOR | VT_LPSTR */ },
	0x0e: { n: 'Manager', t: VT_STRING },
	0x0f: { n: 'Company', t: VT_STRING },
	0x10: { n: 'LinksUpToDate', t: VT_BOOL },
	0x11: { n: 'CharacterCount', t: VT_I4 },
	0x13: { n: 'SharedDoc', t: VT_BOOL },
	0x16: { n: 'HyperlinksChanged', t: VT_BOOL },
	0x17: { n: 'AppVersion', t: VT_I4, p: 'version' },
	0x18: { n: 'DigSig', t: VT_BLOB },
	0x1A: { n: 'ContentType', t: VT_STRING },
	0x1B: { n: 'ContentStatus', t: VT_STRING },
	0x1C: { n: 'Language', t: VT_STRING },
	0x1D: { n: 'Version', t: VT_STRING },
	0xFF: {},
	/* [MS-OLEPS] 2.18 */
	0x80000000: { n: 'Locale', t: VT_UI4 },
	0x80000003: { n: 'Behavior', t: VT_UI4 },
	0x72627262: {}
};

/* [MS-OSHARED] 2.3.3.2.1.1 Summary Information Property Set PIDSI */
var SummaryPIDSI = {
	0x01: { n: 'CodePage', t: VT_I2 },
	0x02: { n: 'Title', t: VT_STRING },
	0x03: { n: 'Subject', t: VT_STRING },
	0x04: { n: 'Author', t: VT_STRING },
	0x05: { n: 'Keywords', t: VT_STRING },
	0x06: { n: 'Comments', t: VT_STRING },
	0x07: { n: 'Template', t: VT_STRING },
	0x08: { n: 'LastAuthor', t: VT_STRING },
	0x09: { n: 'RevNumber', t: VT_STRING },
	0x0A: { n: 'EditTime', t: VT_FILETIME },
	0x0B: { n: 'LastPrinted', t: VT_FILETIME },
	0x0C: { n: 'CreatedDate', t: VT_FILETIME },
	0x0D: { n: 'ModifiedDate', t: VT_FILETIME },
	0x0E: { n: 'PageCount', t: VT_I4 },
	0x0F: { n: 'WordCount', t: VT_I4 },
	0x10: { n: 'CharCount', t: VT_I4 },
	0x11: { n: 'Thumbnail', t: VT_CF },
	0x12: { n: 'Application', t: VT_STRING },
	0x13: { n: 'DocSecurity', t: VT_I4 },
	0xFF: {},
	/* [MS-OLEPS] 2.18 */
	0x80000000: { n: 'Locale', t: VT_UI4 },
	0x80000003: { n: 'Behavior', t: VT_UI4 },
	0x72627262: {}
};

/* [MS-XLS] 2.4.63 Country/Region codes */
var CountryEnum = {
	0x0001: "US", // United States
	0x0002: "CA", // Canada
	0x0003: "", // Latin America (except Brazil)
	0x0007: "RU", // Russia
	0x0014: "EG", // Egypt
	0x001E: "GR", // Greece
	0x001F: "NL", // Netherlands
	0x0020: "BE", // Belgium
	0x0021: "FR", // France
	0x0022: "ES", // Spain
	0x0024: "HU", // Hungary
	0x0027: "IT", // Italy
	0x0029: "CH", // Switzerland
	0x002B: "AT", // Austria
	0x002C: "GB", // United Kingdom
	0x002D: "DK", // Denmark
	0x002E: "SE", // Sweden
	0x002F: "NO", // Norway
	0x0030: "PL", // Poland
	0x0031: "DE", // Germany
	0x0034: "MX", // Mexico
	0x0037: "BR", // Brazil
	0x003d: "AU", // Australia
	0x0040: "NZ", // New Zealand
	0x0042: "TH", // Thailand
	0x0051: "JP", // Japan
	0x0052: "KR", // Korea
	0x0054: "VN", // Viet Nam
	0x0056: "CN", // China
	0x005A: "TR", // Turkey
	0x0069: "JS", // Ramastan
	0x00D5: "DZ", // Algeria
	0x00D8: "MA", // Morocco
	0x00DA: "LY", // Libya
	0x015F: "PT", // Portugal
	0x0162: "IS", // Iceland
	0x0166: "FI", // Finland
	0x01A4: "CZ", // Czech Republic
	0x0376: "TW", // Taiwan
	0x03C1: "LB", // Lebanon
	0x03C2: "JO", // Jordan
	0x03C3: "SY", // Syria
	0x03C4: "IQ", // Iraq
	0x03C5: "KW", // Kuwait
	0x03C6: "SA", // Saudi Arabia
	0x03CB: "AE", // United Arab Emirates
	0x03CC: "IL", // Israel
	0x03CE: "QA", // Qatar
	0x03D5: "IR", // Iran
	0xFFFF: "US"  // United States
};

/* [MS-XLS] 2.5.127 */
var XLSFillPattern = [
	null,
	'solid',
	'mediumGray',
	'darkGray',
	'lightGray',
	'darkHorizontal',
	'darkVertical',
	'darkDown',
	'darkUp',
	'darkGrid',
	'darkTrellis',
	'lightHorizontal',
	'lightVertical',
	'lightDown',
	'lightUp',
	'lightGrid',
	'lightTrellis',
	'gray125',
	'gray0625'
];

function rgbify(arr/*:Array<number>*/)/*:Array<[number, number, number]>*/ { return arr.map(function(x) { return [(x>>16)&255,(x>>8)&255,x&255]; }); }

/* [MS-XLS] 2.5.161 */
/* [MS-XLSB] 2.5.75 Icv */
var _XLSIcv = /*#__PURE__*/ rgbify([
	/* Color Constants */
	0x000000,
	0xFFFFFF,
	0xFF0000,
	0x00FF00,
	0x0000FF,
	0xFFFF00,
	0xFF00FF,
	0x00FFFF,

	/* Overridable Defaults */
	0x000000,
	0xFFFFFF,
	0xFF0000,
	0x00FF00,
	0x0000FF,
	0xFFFF00,
	0xFF00FF,
	0x00FFFF,

	0x800000,
	0x008000,
	0x000080,
	0x808000,
	0x800080,
	0x008080,
	0xC0C0C0,
	0x808080,
	0x9999FF,
	0x993366,
	0xFFFFCC,
	0xCCFFFF,
	0x660066,
	0xFF8080,
	0x0066CC,
	0xCCCCFF,

	0x000080,
	0xFF00FF,
	0xFFFF00,
	0x00FFFF,
	0x800080,
	0x800000,
	0x008080,
	0x0000FF,
	0x00CCFF,
	0xCCFFFF,
	0xCCFFCC,
	0xFFFF99,
	0x99CCFF,
	0xFF99CC,
	0xCC99FF,
	0xFFCC99,

	0x3366FF,
	0x33CCCC,
	0x99CC00,
	0xFFCC00,
	0xFF9900,
	0xFF6600,
	0x666699,
	0x969696,
	0x003366,
	0x339966,
	0x003300,
	0x333300,
	0x993300,
	0x993366,
	0x333399,
	0x333333,

	/* Other entries to appease BIFF8/12 */
	0x000000, /* 0x40 icvForeground ?? */
	0xFFFFFF, /* 0x41 icvBackground ?? */
	0x000000, /* 0x42 icvFrame ?? */
	0x000000, /* 0x43 icv3D ?? */
	0x000000, /* 0x44 icv3DText ?? */
	0x000000, /* 0x45 icv3DHilite ?? */
	0x000000, /* 0x46 icv3DShadow ?? */
	0x000000, /* 0x47 icvHilite ?? */
	0x000000, /* 0x48 icvCtlText ?? */
	0x000000, /* 0x49 icvCtlScrl ?? */
	0x000000, /* 0x4A icvCtlInv ?? */
	0x000000, /* 0x4B icvCtlBody ?? */
	0x000000, /* 0x4C icvCtlFrame ?? */
	0x000000, /* 0x4D icvCtlFore ?? */
	0x000000, /* 0x4E icvCtlBack ?? */
	0x000000, /* 0x4F icvCtlNeutral */
	0x000000, /* 0x50 icvInfoBk ?? */
	0x000000 /* 0x51 icvInfoText ?? */
]);
var XLSIcv = /*#__PURE__*/dup(_XLSIcv);

/* [MS-XLSB] 2.5.97.2 */
var BErr = {
	0x00: "#NULL!",
	0x07: "#DIV/0!",
	0x0F: "#VALUE!",
	0x17: "#REF!",
	0x1D: "#NAME?",
	0x24: "#NUM!",
	0x2A: "#N/A",
	0x2B: "#GETTING_DATA",
	0xFF: "#WTF?"
};
//var RBErr = evert_num(BErr);
var RBErr = {
	"#NULL!":        0x00,
	"#DIV/0!":       0x07,
	"#VALUE!":       0x0F,
	"#REF!":         0x17,
	"#NAME?":        0x1D,
	"#NUM!":         0x24,
	"#N/A":          0x2A,
	"#GETTING_DATA": 0x2B,
	"#WTF?":         0xFF
};

var XLSLblBuiltIn = [
	"_xlnm.Consolidate_Area",
	"_xlnm.Auto_Open",
	"_xlnm.Auto_Close",
	"_xlnm.Extract",
	"_xlnm.Database",
	"_xlnm.Criteria",
	"_xlnm.Print_Area",
	"_xlnm.Print_Titles",
	"_xlnm.Recorder",
	"_xlnm.Data_Form",
	"_xlnm.Auto_Activate",
	"_xlnm.Auto_Deactivate",
	"_xlnm.Sheet_Title",
	"_xlnm._FilterDatabase"
];

/* Parts enumerated in OPC spec, MS-XLSB and MS-XLSX */
/* 12.3 Part Summary <SpreadsheetML> */
/* 14.2 Part Summary <DrawingML> */
/* [MS-XLSX] 2.1 Part Enumerations ; [MS-XLSB] 2.1.7 Part Enumeration */
var ct2type/*{[string]:string}*/ = ({
	/* Workbook */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": "workbooks",
	"application/vnd.ms-excel.sheet.macroEnabled.main+xml": "workbooks",
	"application/vnd.ms-excel.sheet.binary.macroEnabled.main": "workbooks",
	"application/vnd.ms-excel.addin.macroEnabled.main+xml": "workbooks",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": "workbooks",

	/* Worksheet */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": "sheets",
	"application/vnd.ms-excel.worksheet": "sheets",
	"application/vnd.ms-excel.binIndexWs": "TODO", /* Binary Index */

	/* Chartsheet */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": "charts",
	"application/vnd.ms-excel.chartsheet": "charts",

	/* Macrosheet */
	"application/vnd.ms-excel.macrosheet+xml": "macros",
	"application/vnd.ms-excel.macrosheet": "macros",
	"application/vnd.ms-excel.intlmacrosheet": "TODO",
	"application/vnd.ms-excel.binIndexMs": "TODO", /* Binary Index */

	/* Dialogsheet */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": "dialogs",
	"application/vnd.ms-excel.dialogsheet": "dialogs",

	/* Shared Strings */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml": "strs",
	"application/vnd.ms-excel.sharedStrings": "strs",

	/* Styles */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": "styles",
	"application/vnd.ms-excel.styles": "styles",

	/* File Properties */
	"application/vnd.openxmlformats-package.core-properties+xml": "coreprops",
	"application/vnd.openxmlformats-officedocument.custom-properties+xml": "custprops",
	"application/vnd.openxmlformats-officedocument.extended-properties+xml": "extprops",

	/* Custom Data Properties */
	"application/vnd.openxmlformats-officedocument.customXmlProperties+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.customProperty": "TODO",

	/* Comments */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": "comments",
	"application/vnd.ms-excel.comments": "comments",
	"application/vnd.ms-excel.threadedcomments+xml": "threadedcomments",
	"application/vnd.ms-excel.person+xml": "people",

	/* Metadata (Stock/Geography and Dynamic Array) */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml": "metadata",
	"application/vnd.ms-excel.sheetMetadata": "metadata",

	/* PivotTable */
	"application/vnd.ms-excel.pivotTable": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml": "TODO",

	/* Chart Objects */
	"application/vnd.openxmlformats-officedocument.drawingml.chart+xml": "TODO",

	/* Chart Colors */
	"application/vnd.ms-office.chartcolorstyle+xml": "TODO",

	/* Chart Style */
	"application/vnd.ms-office.chartstyle+xml": "TODO",

	/* Chart Advanced */
	"application/vnd.ms-office.chartex+xml": "TODO",

	/* Calculation Chain */
	"application/vnd.ms-excel.calcChain": "calcchains",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml": "calcchains",

	/* Printer Settings */
	"application/vnd.openxmlformats-officedocument.spreadsheetml.printerSettings": "TODO",

	/* ActiveX */
	"application/vnd.ms-office.activeX": "TODO",
	"application/vnd.ms-office.activeX+xml": "TODO",

	/* Custom Toolbars */
	"application/vnd.ms-excel.attachedToolbars": "TODO",

	/* External Data Connections */
	"application/vnd.ms-excel.connections": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": "TODO",

	/* External Links */
	"application/vnd.ms-excel.externalLink": "links",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml": "links",

	/* PivotCache */
	"application/vnd.ms-excel.pivotCacheDefinition": "TODO",
	"application/vnd.ms-excel.pivotCacheRecords": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml": "TODO",

	/* Query Table */
	"application/vnd.ms-excel.queryTable": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.queryTable+xml": "TODO",

	/* Shared Workbook */
	"application/vnd.ms-excel.userNames": "TODO",
	"application/vnd.ms-excel.revisionHeaders": "TODO",
	"application/vnd.ms-excel.revisionLog": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionHeaders+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.revisionLog+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.userNames+xml": "TODO",

	/* Single Cell Table */
	"application/vnd.ms-excel.tableSingleCells": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.tableSingleCells+xml": "TODO",

	/* Slicer */
	"application/vnd.ms-excel.slicer": "TODO",
	"application/vnd.ms-excel.slicerCache": "TODO",
	"application/vnd.ms-excel.slicer+xml": "TODO",
	"application/vnd.ms-excel.slicerCache+xml": "TODO",

	/* Sort Map */
	"application/vnd.ms-excel.wsSortMap": "TODO",

	/* Table */
	"application/vnd.ms-excel.table": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": "TODO",

	/* Themes */
	"application/vnd.openxmlformats-officedocument.theme+xml": "themes",

	/* Theme Override */
	"application/vnd.openxmlformats-officedocument.themeOverride+xml": "TODO",

	/* Timeline */
	"application/vnd.ms-excel.Timeline+xml": "TODO", /* verify */
	"application/vnd.ms-excel.TimelineCache+xml": "TODO", /* verify */

	/* VBA */
	"application/vnd.ms-office.vbaProject": "vba",
	"application/vnd.ms-office.vbaProjectSignature": "TODO",

	/* Volatile Dependencies */
	"application/vnd.ms-office.volatileDependencies": "TODO",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.volatileDependencies+xml": "TODO",

	/* Control Properties */
	"application/vnd.ms-excel.controlproperties+xml": "TODO",

	/* Data Model */
	"application/vnd.openxmlformats-officedocument.model+data": "TODO",

	/* Survey */
	"application/vnd.ms-excel.Survey+xml": "TODO",

	/* Drawing */
	"application/vnd.openxmlformats-officedocument.drawing+xml": "drawings",
	"application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramColors+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramData+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramLayout+xml": "TODO",
	"application/vnd.openxmlformats-officedocument.drawingml.diagramStyle+xml": "TODO",

	/* VML */
	"application/vnd.openxmlformats-officedocument.vmlDrawing": "TODO",

	"application/vnd.openxmlformats-package.relationships+xml": "rels",
	"application/vnd.openxmlformats-officedocument.oleObject": "TODO",

	/* Image */
	"image/png": "TODO",

	"sheet": "js"
}/*:any*/);

var CT_LIST = {
	workbooks: {
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
		xlsm: "application/vnd.ms-excel.sheet.macroEnabled.main+xml",
		xlsb: "application/vnd.ms-excel.sheet.binary.macroEnabled.main",
		xlam: "application/vnd.ms-excel.addin.macroEnabled.main+xml",
		xltx: "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml"
	},
	strs: { /* Shared Strings */
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
		xlsb: "application/vnd.ms-excel.sharedStrings"
	},
	comments: { /* Comments */
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml",
		xlsb: "application/vnd.ms-excel.comments"
	},
	sheets: { /* Worksheet */
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
		xlsb: "application/vnd.ms-excel.worksheet"
	},
	charts: { /* Chartsheet */
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml",
		xlsb: "application/vnd.ms-excel.chartsheet"
	},
	dialogs: { /* Dialogsheet */
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml",
		xlsb: "application/vnd.ms-excel.dialogsheet"
	},
	macros: { /* Macrosheet (Excel 4.0 Macros) */
		xlsx: "application/vnd.ms-excel.macrosheet+xml",
		xlsb: "application/vnd.ms-excel.macrosheet"
	},
	metadata: { /* Metadata (Stock/Geography and Dynamic Array) */
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml",
		xlsb: "application/vnd.ms-excel.sheetMetadata"
	},
	styles: { /* Styles */
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
		xlsb: "application/vnd.ms-excel.styles"
	}
};

function new_ct()/*:any*/ {
	return ({
		workbooks:[], sheets:[], charts:[], dialogs:[], macros:[],
		rels:[], strs:[], comments:[], threadedcomments:[], links:[],
		coreprops:[], extprops:[], custprops:[], themes:[], styles:[],
		calcchains:[], vba: [], drawings: [], metadata: [], people:[],
		TODO:[], xmlns: "" }/*:any*/);
}

function parse_ct(data/*:?string*/) {
	var ct = new_ct();
	if(!data || !data.match) return ct;
	var ctext = {};
	(data.match(tagregex)||[]).forEach(function(x) {
		var y = parsexmltag(x);
		switch(y[0].replace(nsregex,"<")) {
			case '<?xml': break;
			case '<Types': ct.xmlns = y['xmlns' + (y[0].match(/<(\w+):/)||["",""])[1] ]; break;
			case '<Default': ctext[y.Extension.toLowerCase()] = y.ContentType; break;
			case '<Override':
				if(ct[ct2type[y.ContentType]] !== undefined) ct[ct2type[y.ContentType]].push(y.PartName);
				break;
		}
	});
	if(ct.xmlns !== XMLNS.CT) throw new Error("Unknown Namespace: " + ct.xmlns);
	ct.calcchain = ct.calcchains.length > 0 ? ct.calcchains[0] : "";
	ct.sst = ct.strs.length > 0 ? ct.strs[0] : "";
	ct.style = ct.styles.length > 0 ? ct.styles[0] : "";
	ct.defaults = ctext;
	delete ct.calcchains;
	return ct;
}

function write_ct(ct, opts, raw)/*:string*/ {
	var type2ct/*{[string]:Array<string>}*/ = evert_arr(ct2type);

	var o/*:Array<string>*/ = [], v;

	if(!raw) {
		o[o.length] = (XML_HEADER);
		o[o.length] = writextag('Types', null, {
			'xmlns': XMLNS.CT,
			'xmlns:xsd': XMLNS.xsd,
			'xmlns:xsi': XMLNS.xsi
		});
		o = o.concat([
			['xml', 'application/xml'],
			['bin', 'application/vnd.ms-excel.sheet.binary.macroEnabled.main'],
			['vml', 'application/vnd.openxmlformats-officedocument.vmlDrawing'],
			['data', 'application/vnd.openxmlformats-officedocument.model+data'],
			/* from test files */
			['bmp', 'image/bmp'],
			['png', 'image/png'],
			['gif', 'image/gif'],
			['emf', 'image/x-emf'],
			['wmf', 'image/x-wmf'],
			['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'],
			['tif', 'image/tiff'], ['tiff', 'image/tiff'],
			['pdf', 'application/pdf'],
			['rels', 'application/vnd.openxmlformats-package.relationships+xml']
		].map(function(x) {
			return writextag('Default', null, {'Extension':x[0], 'ContentType': x[1]});
		}));
	}

	/* only write first instance */
	var f1 = function(w) {
		if(ct[w] && ct[w].length > 0) {
			v = ct[w][0];
			o[o.length] = (writextag('Override', null, {
				'PartName': (v[0] == '/' ? "":"/") + v,
				'ContentType': CT_LIST[w][opts.bookType] || CT_LIST[w]['xlsx']
			}));
		}
	};

	/* book type-specific */
	var f2 = function(w) {
		(ct[w]||[]).forEach(function(v) {
			o[o.length] = (writextag('Override', null, {
				'PartName': (v[0] == '/' ? "":"/") + v,
				'ContentType': CT_LIST[w][opts.bookType] || CT_LIST[w]['xlsx']
			}));
		});
	};

	/* standard type */
	var f3 = function(t) {
		(ct[t]||[]).forEach(function(v) {
			o[o.length] = (writextag('Override', null, {
				'PartName': (v[0] == '/' ? "":"/") + v,
				'ContentType': type2ct[t][0]
			}));
		});
	};

	f1('workbooks');
	f2('sheets');
	f2('charts');
	f3('themes');
	['strs', 'styles'].forEach(f1);
	['coreprops', 'extprops', 'custprops'].forEach(f3);
	f3('vba');
	f3('comments');
	f3('threadedcomments');
	f3('drawings');
	f2('metadata');
	f3('people');
	if(!raw && o.length>2){ o[o.length] = ('</Types>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
/* 9.3 Relationships */
var RELS = ({
	WB: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
	SHEET: "http://sheetjs.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
	HLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
	VML: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing",
	XPATH: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLinkPath",
	XMISS: "http://schemas.microsoft.com/office/2006/relationships/xlExternalLinkPath/xlPathMissing",
	XLINK: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink",
	CXML: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml",
	CXMLP: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps",
	CMNT: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
	CORE_PROPS: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
	EXT_PROPS: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
	CUST_PROPS: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties',
	SST: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
	STY: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
	THEME: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
	CHART: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
	CHARTEX: "http://schemas.microsoft.com/office/2014/relationships/chartEx",
	CS: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chartsheet",
	WS: [
		"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
		"http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet"
	],
	DS: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/dialogsheet",
	MS: "http://schemas.microsoft.com/office/2006/relationships/xlMacrosheet",
	IMG: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
	DRAW: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
	XLMETA: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sheetMetadata",
	TCMNT: "http://schemas.microsoft.com/office/2017/10/relationships/threadedComment",
	PEOPLE: "http://schemas.microsoft.com/office/2017/10/relationships/person",
	CONN: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/connections",
	VBA: "http://schemas.microsoft.com/office/2006/relationships/vbaProject"
}/*:any*/);

/* 9.3.3 Representing Relationships */
function get_rels_path(file/*:string*/)/*:string*/ {
	var n = file.lastIndexOf("/");
	return file.slice(0,n+1) + '_rels/' + file.slice(n+1) + ".rels";
}

function parse_rels(data/*:?string*/, currentFilePath/*:string*/) {
	var rels = {"!id":{}};
	if (!data) return rels;
	if (currentFilePath.charAt(0) !== '/') {
		currentFilePath = '/'+currentFilePath;
	}
	var hash = {};

	(data.match(tagregex)||[]).forEach(function(x) {
		var y = parsexmltag(x);
		/* 9.3.2.2 OPC_Relationships */
		if (y[0] === '<Relationship') {
			var rel = {}; rel.Type = y.Type; rel.Target = unescapexml(y.Target); rel.Id = y.Id; if(y.TargetMode) rel.TargetMode = y.TargetMode;
			var canonictarget = y.TargetMode === 'External' ? y.Target : resolve_path(y.Target, currentFilePath);
			rels[canonictarget] = rel;
			hash[y.Id] = rel;
		}
	});
	rels["!id"] = hash;
	return rels;
}


/* TODO */
function write_rels(rels)/*:string*/ {
	var o = [XML_HEADER, writextag('Relationships', null, {
		//'xmlns:ns0': XMLNS.RELS,
		'xmlns': XMLNS.RELS
	})];
	keys(rels['!id']).forEach(function(rid) {
		o[o.length] = (writextag('Relationship', null, rels['!id'][rid]));
	});
	if(o.length>2){ o[o.length] = ('</Relationships>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}

function add_rels(rels, rId/*:number*/, f, type, relobj, targetmode/*:?string*/)/*:number*/ {
	if(!relobj) relobj = {};
	if(!rels['!id']) rels['!id'] = {};
	if(!rels['!idx']) rels['!idx'] = 1;
	if(rId < 0) for(rId = rels['!idx']; rels['!id']['rId' + rId]; ++rId){/* empty */}
	rels['!idx'] = rId + 1;
	relobj.Id = 'rId' + rId;
	relobj.Type = type;
	relobj.Target = f;
	if(targetmode) relobj.TargetMode = targetmode;
	else if([RELS.HLINK, RELS.XPATH, RELS.XMISS].indexOf(relobj.Type) > -1) relobj.TargetMode = "External";
	if(rels['!id'][relobj.Id]) throw new Error("Cannot rewrite rId " + rId);
	rels['!id'][relobj.Id] = relobj;
	rels[('/' + relobj.Target).replace("//","/")] = relobj;
	return rId;
}
var CT_ODS = "application/vnd.oasis.opendocument.spreadsheet";
function parse_manifest(d, opts) {
  var str = xlml_normalize(d);
  var Rn;
  var FEtag;
  while (Rn = xlmlregex.exec(str))
    switch (Rn[3]) {
      case "manifest":
        break;
      case "file-entry":
        FEtag = parsexmltag(Rn[0], false);
        if (FEtag.path == "/" && FEtag.type !== CT_ODS)
          throw new Error("This OpenDocument is not a spreadsheet");
        break;
      case "encryption-data":
      case "algorithm":
      case "start-key-generation":
      case "key-derivation":
        throw new Error("Unsupported ODS Encryption");
      default:
        if (opts && opts.WTF)
          throw Rn;
    }
}
function write_manifest(manifest) {
  var o = [XML_HEADER];
  o.push('<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">\n');
  o.push('  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>\n');
  for (var i = 0; i < manifest.length; ++i)
    o.push('  <manifest:file-entry manifest:full-path="' + manifest[i][0] + '" manifest:media-type="' + manifest[i][1] + '"/>\n');
  o.push("</manifest:manifest>");
  return o.join("");
}
function write_rdf_type(file, res, tag) {
  return [
    '  <rdf:Description rdf:about="' + file + '">\n',
    '    <rdf:type rdf:resource="http://docs.oasis-open.org/ns/office/1.2/meta/' + (tag || "odf") + "#" + res + '"/>\n',
    "  </rdf:Description>\n"
  ].join("");
}
function write_rdf_has(base, file) {
  return [
    '  <rdf:Description rdf:about="' + base + '">\n',
    '    <ns0:hasPart xmlns:ns0="http://docs.oasis-open.org/ns/office/1.2/meta/pkg#" rdf:resource="' + file + '"/>\n',
    "  </rdf:Description>\n"
  ].join("");
}
function write_rdf(rdf) {
  var o = [XML_HEADER];
  o.push('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n');
  for (var i = 0; i != rdf.length; ++i) {
    o.push(write_rdf_type(rdf[i][0], rdf[i][1]));
    o.push(write_rdf_has("", rdf[i][0]));
  }
  o.push(write_rdf_type("", "Document", "pkg"));
  o.push("</rdf:RDF>");
  return o.join("");
}
function write_meta_ods(wb, opts) {
  return '<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.2"><office:meta><meta:generator>SheetJS ' + XLSX.version + "</meta:generator></office:meta></office:document-meta>";
}
/* ECMA-376 Part II 11.1 Core Properties Part */
/* [MS-OSHARED] 2.3.3.2.[1-2].1 (PIDSI/PIDDSI) */
var CORE_PROPS/*:Array<Array<string> >*/ = [
	["cp:category", "Category"],
	["cp:contentStatus", "ContentStatus"],
	["cp:keywords", "Keywords"],
	["cp:lastModifiedBy", "LastAuthor"],
	["cp:lastPrinted", "LastPrinted"],
	["cp:revision", "RevNumber"],
	["cp:version", "Version"],
	["dc:creator", "Author"],
	["dc:description", "Comments"],
	["dc:identifier", "Identifier"],
	["dc:language", "Language"],
	["dc:subject", "Subject"],
	["dc:title", "Title"],
	["dcterms:created", "CreatedDate", 'date'],
	["dcterms:modified", "ModifiedDate", 'date']
];

function parse_core_props(data) {
	var p = {};
	data = utf8read(data);

	for(var i = 0; i < CORE_PROPS.length; ++i) {
		var f = CORE_PROPS[i], cur = str_match_xml(data, f[0]);
		if(cur != null && cur.length > 0) p[f[1]] = unescapexml(cur[1]);
		if(f[2] === 'date' && p[f[1]]) p[f[1]] = parseDate(p[f[1]]);
	}

	return p;
}

function cp_doit(f, g, h, o, p) {
	if(p[f] != null || g == null || g === "") return;
	p[f] = g;
	g = escapexml(g);
	o[o.length] = (h ? writextag(f,g,h) : writetag(f,g));
}

function write_core_props(cp, _opts) {
	var opts = _opts || {};
	var o = [XML_HEADER, writextag('cp:coreProperties', null, {
		//'xmlns': XMLNS.CORE_PROPS,
		'xmlns:cp': XMLNS.CORE_PROPS,
		'xmlns:dc': XMLNS.dc,
		'xmlns:dcterms': XMLNS.dcterms,
		'xmlns:dcmitype': XMLNS.dcmitype,
		'xmlns:xsi': XMLNS.xsi
	})], p = {};
	if(!cp && !opts.Props) return o.join("");

	if(cp) {
		if(cp.CreatedDate != null) cp_doit("dcterms:created", typeof cp.CreatedDate === "string" ? cp.CreatedDate : write_w3cdtf(cp.CreatedDate, opts.WTF), {"xsi:type":"dcterms:W3CDTF"}, o, p);
		if(cp.ModifiedDate != null) cp_doit("dcterms:modified", typeof cp.ModifiedDate === "string" ? cp.ModifiedDate : write_w3cdtf(cp.ModifiedDate, opts.WTF), {"xsi:type":"dcterms:W3CDTF"}, o, p);
	}

	for(var i = 0; i != CORE_PROPS.length; ++i) {
		var f = CORE_PROPS[i];
		var v = opts.Props && opts.Props[f[1]] != null ? opts.Props[f[1]] : cp ? cp[f[1]] : null;
		if(v === true) v = "1";
		else if(v === false) v = "0";
		else if(typeof v == "number") v = String(v);
		if(v != null) cp_doit(f[0], v, null, o, p);
	}
	if(o.length>2){ o[o.length] = ('</cp:coreProperties>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
/* 15.2.12.3 Extended File Properties Part */
/* [MS-OSHARED] 2.3.3.2.[1-2].1 (PIDSI/PIDDSI) */
var EXT_PROPS/*:Array<Array<string> >*/ = [
	["Application", "Application", "string"],
	["AppVersion", "AppVersion", "string"],
	["Company", "Company", "string"],
	["DocSecurity", "DocSecurity", "string"],
	["Manager", "Manager", "string"],
	["HyperlinksChanged", "HyperlinksChanged", "bool"],
	["SharedDoc", "SharedDoc", "bool"],
	["LinksUpToDate", "LinksUpToDate", "bool"],
	["ScaleCrop", "ScaleCrop", "bool"],
	["HeadingPairs", "HeadingPairs", "raw"],
	["TitlesOfParts", "TitlesOfParts", "raw"]
];

var PseudoPropsPairs = [
	"Worksheets",  "SheetNames",
	"NamedRanges", "DefinedNames",
	"Chartsheets", "ChartNames"
];
function load_props_pairs(HP/*:string|Array<Array<any>>*/, TOP, props, opts) {
	var v = [];
	if(typeof HP == "string") v = parseVector(HP, opts);
	else for(var j = 0; j < HP.length; ++j) v = v.concat(HP[j].map(function(hp) { return {v:hp}; }));
	var parts = (typeof TOP == "string") ? parseVector(TOP, opts).map(function (x) { return x.v; }) : TOP;
	var idx = 0, len = 0;
	if(parts.length > 0) for(var i = 0; i !== v.length; i += 2) {
		len = +(v[i+1].v);
		switch(v[i].v) {
			case "Worksheets":
			case "工作表":
			case "Листы":
			case "أوراق العمل":
			case "ワークシート":
			case "גליונות עבודה":
			case "Arbeitsblätter":
			case "Çalışma Sayfaları":
			case "Feuilles de calcul":
			case "Fogli di lavoro":
			case "Folhas de cálculo":
			case "Planilhas":
			case "Regneark":
			case "Hojas de cálculo":
			case "Werkbladen":
				props.Worksheets = len;
				props.SheetNames = parts.slice(idx, idx + len);
				break;

			case "Named Ranges":
			case "Rangos con nombre":
			case "名前付き一覧":
			case "Benannte Bereiche":
			case "Navngivne områder":
				props.NamedRanges = len;
				props.DefinedNames = parts.slice(idx, idx + len);
				break;

			case "Charts":
			case "Diagramme":
				props.Chartsheets = len;
				props.ChartNames = parts.slice(idx, idx + len);
				break;
		}
		idx += len;
	}
}

function parse_ext_props(data, p, opts) {
	var q = {}; if(!p) p = {};
	data = utf8read(data);

	EXT_PROPS.forEach(function(f) {
		var xml = (str_match_xml_ns(data, f[0])||[])[1];
		switch(f[2]) {
			case "string": if(xml) p[f[1]] = unescapexml(xml); break;
			case "bool": p[f[1]] = xml === "true"; break;
			case "raw":
				var cur = str_match_xml(data, f[0]);
				if(cur && cur.length > 0) q[f[1]] = cur[1];
				break;
		}
	});

	if(q.HeadingPairs && q.TitlesOfParts) load_props_pairs(q.HeadingPairs, q.TitlesOfParts, p, opts);

	return p;
}

function write_ext_props(cp/*::, opts*/)/*:string*/ {
	var o/*:Array<string>*/ = [], W = writextag;
	if(!cp) cp = {};
	cp.Application = "SheetJS";
	o[o.length] = (XML_HEADER);
	o[o.length] = (writextag('Properties', null, {
		'xmlns': XMLNS.EXT_PROPS,
		'xmlns:vt': XMLNS.vt
	}));

	EXT_PROPS.forEach(function(f) {
		if(cp[f[1]] === undefined) return;
		var v;
		switch(f[2]) {
			case 'string': v = escapexml(String(cp[f[1]])); break;
			case 'bool': v = cp[f[1]] ? 'true' : 'false'; break;
		}
		if(v !== undefined) o[o.length] = (W(f[0], v));
	});

	/* TODO: HeadingPairs, TitlesOfParts */
	o[o.length] = (W('HeadingPairs', W('vt:vector', W('vt:variant', '<vt:lpstr>Worksheets</vt:lpstr>')+W('vt:variant', W('vt:i4', String(cp.Worksheets))), {size:2, baseType:"variant"})));
	o[o.length] = (W('TitlesOfParts', W('vt:vector', cp.SheetNames.map(function(s) { return "<vt:lpstr>" + escapexml(s) + "</vt:lpstr>"; }).join(""), {size: cp.Worksheets, baseType:"lpstr"})));
	if(o.length>2){ o[o.length] = ('</Properties>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
/* 15.2.12.2 Custom File Properties Part */
var custregex = /<[^<>]+>[^<]*/g;
function parse_cust_props(data/*:string*/, opts) {
	var p = {}, name = "";
	var m = data.match(custregex);
	if(m) for(var i = 0; i != m.length; ++i) {
		var x = m[i], y = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<?xml': break;
			case '<Properties': break;
			case '<property': name = unescapexml(y.name); break;
			case '</property>': name = null; break;
			default: if (x.indexOf('<vt:') === 0) {
				var toks = x.split('>');
				var type = toks[0].slice(4), text = toks[1];
				/* 22.4.2.32 (CT_Variant). Omit the binary types from 22.4 (Variant Types) */
				switch(type) {
					case 'lpstr': case 'bstr': case 'lpwstr':
						p[name] = unescapexml(text);
						break;
					case 'bool':
						p[name] = parsexmlbool(text);
						break;
					case 'i1': case 'i2': case 'i4': case 'i8': case 'int': case 'uint':
						p[name] = parseInt(text, 10);
						break;
					case 'r4': case 'r8': case 'decimal':
						p[name] = parseFloat(text);
						break;
					case 'filetime': case 'date':
						p[name] = parseDate(text);
						break;
					case 'cy': case 'error':
						p[name] = unescapexml(text);
						break;
					default:
						if(type.slice(-1) == '/') break;
						if(opts.WTF && typeof console !== 'undefined') console.warn('Unexpected', x, type, toks);
				}
			} else if(x.slice(0,2) === "</") {/* empty */
			} else if(opts.WTF) throw new Error(x);
		}
	}
	return p;
}

function write_cust_props(cp/*::, opts*/)/*:string*/ {
	var o = [XML_HEADER, writextag('Properties', null, {
		'xmlns': XMLNS.CUST_PROPS,
		'xmlns:vt': XMLNS.vt
	})];
	if(!cp) return o.join("");
	var pid = 1;
	keys(cp).forEach(function custprop(k) { ++pid;
		o[o.length] = (writextag('property', write_vt(cp[k], true), {
			'fmtid': '{D5CDD505-2E9C-101B-9397-08002B2CF9AE}',
			'pid': pid,
			'name': escapexml(k)
		}));
	});
	if(o.length>2){ o[o.length] = '</Properties>'; o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
var DBF_SUPPORTED_VERSIONS = [0x02, 0x03, 0x30, 0x31, 0x83, 0x8B, 0x8C, 0xF5];
var DBF = /*#__PURE__*/(function() {
var dbf_codepage_map = {
	/* Code Pages Supported by Visual FoxPro */
	0x01:   437,           0x02:   850,
	0x03:  1252,           0x04: 10000,
	0x64:   852,           0x65:   866,
	0x66:   865,           0x67:   861,
	0x68:   895,           0x69:   620,
	0x6A:   737,           0x6B:   857,
	0x78:   950,           0x79:   949,
	0x7A:   936,           0x7B:   932,
	0x7C:   874,           0x7D:  1255,
	0x7E:  1256,           0x96: 10007,
	0x97: 10029,           0x98: 10006,
	0xC8:  1250,           0xC9:  1251,
	0xCA:  1254,           0xCB:  1253,

	/* shapefile DBF extension */
	0x00: 20127,           0x08:   865,
	0x09:   437,           0x0A:   850,
	0x0B:   437,           0x0D:   437,
	0x0E:   850,           0x0F:   437,
	0x10:   850,           0x11:   437,
	0x12:   850,           0x13:   932,
	0x14:   850,           0x15:   437,
	0x16:   850,           0x17:   865,
	0x18:   437,           0x19:   437,
	0x1A:   850,           0x1B:   437,
	0x1C:   863,           0x1D:   850,
	0x1F:   852,           0x22:   852,
	0x23:   852,           0x24:   860,
	0x25:   850,           0x26:   866,
	0x37:   850,           0x40:   852,
	0x4D:   936,           0x4E:   949,
	0x4F:   950,           0x50:   874,
	0x57:  1252,           0x58:  1252,
	0x59:  1252,           0x6C:   863,
	0x86:   737,           0x87:   852,
	0x88:   857,           0xCC:  1257,

	0xFF: 16969
};
var dbf_reverse_map = evert({
	0x01:   437,           0x02:   850,
	0x03:  1252,           0x04: 10000,
	0x64:   852,           0x65:   866,
	0x66:   865,           0x67:   861,
	0x68:   895,           0x69:   620,
	0x6A:   737,           0x6B:   857,
	0x78:   950,           0x79:   949,
	0x7A:   936,           0x7B:   932,
	0x7C:   874,           0x7D:  1255,
	0x7E:  1256,           0x96: 10007,
	0x97: 10029,           0x98: 10006,
	0xC8:  1250,           0xC9:  1251,
	0xCA:  1254,           0xCB:  1253,
	0x00: 20127
});
/* TODO: find an actual specification */
function dbf_to_aoa(buf, opts)/*:AOA*/ {
	var out/*:AOA*/ = [];
	var d/*:Block*/ = (new_raw_buf(1)/*:any*/);
	switch(opts.type) {
		case 'base64': d = s2a(Base64_decode(buf)); break;
		case 'binary': d = s2a(buf); break;
		case 'buffer':
		case 'array': d = buf; break;
	}
	prep_blob(d, 0);

	/* header */
	var ft = d.read_shift(1);
	var memo = !!(ft & 0x88);
	var vfp = false, l7 = false;
	switch(ft) {
		case 0x02: break; // dBASE II
		case 0x03: break; // dBASE III
		case 0x30: vfp = true; memo = true; break; // VFP
		case 0x31: vfp = true; memo = true; break; // VFP with autoincrement
		// 0x43 dBASE IV SQL table files
		// 0x63 dBASE IV SQL system files
		case 0x83: break; // dBASE III with memo
		case 0x8B: break; // dBASE IV with memo
		case 0x8C: l7 = true; break; // dBASE Level 7 with memo
		// case 0xCB dBASE IV SQL table files with memo
		case 0xF5: break; // FoxPro 2.x with memo
		// case 0xFB FoxBASE
		default: throw new Error("DBF Unsupported Version: " + ft.toString(16));
	}

	var nrow = 0, fpos = 0x0209;
	if(ft == 0x02) nrow = d.read_shift(2);
	d.l += 3; // dBASE II stores DDMMYY date, others use YYMMDD
	if(ft != 0x02) nrow = d.read_shift(4);
	if(nrow > 1048576) nrow = 1e6;

	if(ft != 0x02) fpos = d.read_shift(2); // header length
	var rlen = d.read_shift(2); // record length

	var /*flags = 0,*/ current_cp = opts.codepage || 1252;
	if(ft != 0x02) { // 20 reserved bytes
		d.l+=16;
		/*flags = */d.read_shift(1);
		//if(memo && ((flags & 0x02) === 0)) throw new Error("DBF Flags " + flags.toString(16) + " ft " + ft.toString(16));

		/* codepage present in FoxPro and dBASE Level 7 */
		if(d[d.l] !== 0) current_cp = dbf_codepage_map[d[d.l]];
		d.l+=1;

		d.l+=2;
	}
	if(l7) d.l += 36; // Level 7: 32 byte "Language driver name", 4 byte reserved

/*:: type DBFField = { name:string; len:number; type:string; } */
	var fields/*:Array<DBFField>*/ = [], field/*:DBFField*/ = ({}/*:any*/);
	var hend = Math.min(d.length, (ft == 0x02 ? 0x209 : (fpos - 10 - (vfp ? 264 : 0))));
	var ww = l7 ? 32 : 11;
	while(d.l < hend && d[d.l] != 0x0d) {
		field = ({}/*:any*/);
		field.name = (typeof $cptable !== "undefined" ? $cptable.utils.decode(current_cp, d.slice(d.l, d.l+ww)) : a2s(d.slice(d.l, d.l + ww))).replace(/[\u0000\r\n][\S\s]*$/g,"");
		d.l += ww;
		field.type = String.fromCharCode(d.read_shift(1));
		if(ft != 0x02 && !l7) field.offset = d.read_shift(4);
		field.len = d.read_shift(1);
		if(ft == 0x02) field.offset = d.read_shift(2);
		field.dec = d.read_shift(1);
		if(field.name.length) fields.push(field);
		if(ft != 0x02) d.l += l7 ? 13 : 14;
		switch(field.type) {
			case 'B': // Double (VFP) / Binary (dBASE L7)
				if((!vfp || field.len != 8) && opts.WTF) console.log('Skipping ' + field.name + ':' + field.type);
				break;
			case 'G': // General (FoxPro and dBASE L7)
			case 'P': // Picture (FoxPro and dBASE L7)
				if(opts.WTF) console.log('Skipping ' + field.name + ':' + field.type);
				break;
			case '+': // Autoincrement (dBASE L7 only)
			case '0': // _NullFlags (VFP only)
			case '@': // Timestamp (dBASE L7 only)
			case 'C': // Character (dBASE II)
			case 'D': // Date (dBASE III)
			case 'F': // Float (dBASE IV)
			case 'I': // Long (VFP and dBASE L7)
			case 'L': // Logical (dBASE II)
			case 'M': // Memo (dBASE III)
			case 'N': // Number (dBASE II)
			case 'O': // Double (dBASE L7 only)
			case 'T': // Datetime (VFP only)
			case 'Y': // Currency (VFP only)
				break;
			default: throw new Error('Unknown Field Type: ' + field.type);
		}
	}

	if(d[d.l] !== 0x0D) d.l = fpos-1;
	if(d.read_shift(1) !== 0x0D) throw new Error("DBF Terminator not found " + d.l + " " + d[d.l]);
	d.l = fpos;

	/* data */
	var R = 0, C = 0;
	out[0] = [];
	for(C = 0; C != fields.length; ++C) out[0][C] = fields[C].name;
	while(nrow-- > 0) {
		if(d[d.l] === 0x2A) {
			// TODO: record marked as deleted -- create a hidden row?
			d.l+=rlen;
			continue;
		}
		++d.l;
		out[++R] = []; C = 0;
		for(C = 0; C != fields.length; ++C) {
			var dd = d.slice(d.l, d.l+fields[C].len); d.l+=fields[C].len;
			prep_blob(dd, 0);
			var s = typeof $cptable !== "undefined" ? $cptable.utils.decode(current_cp, dd) : a2s(dd);
			switch(fields[C].type) {
				case 'C':
					// NOTE: it is conventional to write '  /  /  ' for empty dates
					if(s.trim().length) out[R][C] = s.replace(/([^\s])\s+$/,"$1");
					break;
				case 'D':
					if(s.length === 8) {
						out[R][C] = new Date(Date.UTC(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8), 0, 0, 0, 0));
						if(!(opts && opts.UTC)) { out[R][C] = utc_to_local(out[R][C]); }
					}
					else out[R][C] = s;
					break;
				case 'F': out[R][C] = parseFloat(s.trim()); break;
				case '+': case 'I': out[R][C] = l7 ? dd.read_shift(-4, 'i') ^ 0x80000000 : dd.read_shift(4, 'i'); break;
				case 'L': switch(s.trim().toUpperCase()) {
					case 'Y': case 'T': out[R][C] = true; break;
					case 'N': case 'F': out[R][C] = false; break;
					case '': case '\x00': case '?': break;
					default: throw new Error("DBF Unrecognized L:|" + s + "|");
					} break;
				case 'M': /* TODO: handle memo files */
					if(!memo) throw new Error("DBF Unexpected MEMO for type " + ft.toString(16));
					out[R][C] = "##MEMO##" + (l7 ? parseInt(s.trim(), 10): dd.read_shift(4));
					break;
				case 'N':
					s = s.replace(/\u0000/g,"").trim();
					// NOTE: dBASE II interprets "  .  " as 0
					if(s && s != ".") out[R][C] = +s || 0; break;
				case '@':
					// NOTE: dBASE specs appear to be incorrect
					out[R][C] = new Date(dd.read_shift(-8, 'f') - 0x388317533400);
					break;
				case 'T': {
					var hi = dd.read_shift(4), lo = dd.read_shift(4);
					if(hi == 0 && lo == 0) break;
					out[R][C] = new Date((hi - 0x253D8C) * 0x5265C00 + lo);
					if(!(opts && opts.UTC)) out[R][C] = utc_to_local(out[R][C]);
				} break;
				case 'Y': out[R][C] = dd.read_shift(4,'i')/1e4 + (dd.read_shift(4, 'i')/1e4)*Math.pow(2,32); break;
				case 'O': out[R][C] = -dd.read_shift(-8, 'f'); break;
				case 'B': if(vfp && fields[C].len == 8) { out[R][C] = dd.read_shift(8,'f'); break; }
					/* falls through */
				case 'G': case 'P': dd.l += fields[C].len; break;
				case '0':
					if(fields[C].name === '_NullFlags') break;
					/* falls through */
				default: throw new Error("DBF Unsupported data type " + fields[C].type);
			}
		}
	}
	if(ft != 0x02) if(d.l < d.length && d[d.l++] != 0x1A) throw new Error("DBF EOF Marker missing " + (d.l-1) + " of " + d.length + " " + d[d.l-1].toString(16));
	if(opts && opts.sheetRows) out = out.slice(0, opts.sheetRows);
	opts.DBF = fields;
	return out;
}

function dbf_to_sheet(buf, opts)/*:Worksheet*/ {
	var o = opts || {};
	if(!o.dateNF) o.dateNF = "yyyymmdd";
	var ws = aoa_to_sheet(dbf_to_aoa(buf, o), o);
	ws["!cols"] = o.DBF.map(function(field) { return {
		wch: field.len,
		DBF: field
	};});
	delete o.DBF;
	return ws;
}

function dbf_to_workbook(buf, opts)/*:Workbook*/ {
	try {
		var o = sheet_to_workbook(dbf_to_sheet(buf, opts), opts);
		o.bookType = "dbf";
		return o;
	} catch(e) { if(opts && opts.WTF) throw e; }
	return ({SheetNames:[],Sheets:{}});
}

var _RLEN = { 'B': 8, 'C': 250, 'L': 1, 'D': 8, '?': 0, '': 0 };
function sheet_to_dbf(ws/*:Worksheet*/, opts/*:WriteOpts*/) {
	if(!ws["!ref"]) throw new Error("Cannot export empty sheet to DBF");
	var o = opts || {};
	var old_cp = current_codepage;
	if(+o.codepage >= 0) set_cp(+o.codepage);
	if(o.type == "string") throw new Error("Cannot write DBF to JS string");
	var ba = buf_array();
	var aoa/*:AOA*/ = sheet_to_json(ws, {header:1, raw:true, cellDates:true});
	var headers = aoa[0], data = aoa.slice(1), cols = ws["!cols"] || [];
	var i = 0, j = 0, hcnt = 0, rlen = 1;
	for(i = 0; i < headers.length; ++i) {
		if(((cols[i]||{}).DBF||{}).name) { headers[i] = cols[i].DBF.name; ++hcnt; continue; }
		if(headers[i] == null) continue;
		++hcnt;
		if(typeof headers[i] === 'number') headers[i] = headers[i].toString(10);
		if(typeof headers[i] !== 'string') throw new Error("DBF Invalid column name " + headers[i] + " |" + (typeof headers[i]) + "|");
		if(headers.indexOf(headers[i]) !== i) for(j=0; j<1024;++j)
			if(headers.indexOf(headers[i] + "_" + j) == -1) { headers[i] += "_" + j; break; }
	}
	var range = safe_decode_range(ws['!ref']);
	var coltypes/*:Array<string>*/ = [];
	var colwidths/*:Array<number>*/ = [];
	var coldecimals/*:Array<number>*/ = [];
	for(i = 0; i <= range.e.c - range.s.c; ++i) {
		var guess = '', _guess = '', maxlen = 0;
		var col/*:Array<any>*/ = [];
		for(j=0; j < data.length; ++j) {
			if(data[j][i] != null) col.push(data[j][i]);
		}
		if(col.length == 0 || headers[i] == null) { coltypes[i] = '?'; continue; }
		for(j = 0; j < col.length; ++j) {
			switch(typeof col[j]) {
				/* TODO: check if L2 compat is desired */
				case 'number': _guess = 'B'; break;
				case 'string': _guess = 'C'; break;
				case 'boolean': _guess = 'L'; break;
				case 'object': _guess = col[j] instanceof Date ? 'D' : 'C'; break;
				default: _guess = 'C';
			}
			/* TODO: cache the values instead of encoding twice */
			maxlen = Math.max(maxlen, (typeof $cptable !== "undefined" && typeof col[j] == "string" ? $cptable.utils.encode(current_ansi, col[j]): String(col[j])).length);
			guess = guess && guess != _guess ? 'C' : _guess;
			//if(guess == 'C') break;
		}
		if(maxlen > 250) maxlen = 250;
		_guess = ((cols[i]||{}).DBF||{}).type;
		/* TODO: more fine grained control over DBF type resolution */
		if(_guess == 'C') {
			if(cols[i].DBF.len > maxlen) maxlen = cols[i].DBF.len;
		}
		if(guess == 'B' && _guess == 'N') {
			guess = 'N';
			coldecimals[i] = cols[i].DBF.dec;
			maxlen = cols[i].DBF.len;
		}
		colwidths[i] = guess == 'C' || _guess == 'N' ? maxlen : (_RLEN[guess] || 0);
		rlen += colwidths[i];
		coltypes[i] = guess;
	}

	var h = ba.next(32);
	h.write_shift(4, 0x13021130);
	h.write_shift(4, data.length);
	h.write_shift(2, 296 + 32 * hcnt);
	h.write_shift(2, rlen);
	for(i=0; i < 4; ++i) h.write_shift(4, 0);
	var cp = +dbf_reverse_map[/*::String(*/current_codepage/*::)*/] || 0x03;
	h.write_shift(4, 0x00000000 | (cp<<8));
	if(dbf_codepage_map[cp] != +o.codepage) {
		if(o.codepage) console.error("DBF Unsupported codepage " + current_codepage + ", using 1252");
		current_codepage = 1252;
	}

	for(i = 0, j = 0; i < headers.length; ++i) {
		if(headers[i] == null) continue;
		var hf = ba.next(32);
		/* TODO: test how applications handle non-ASCII field names */
		var _f = (headers[i].slice(-10) + "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00").slice(0, 11);
		hf.write_shift(1, _f, "sbcs");
		hf.write_shift(1, coltypes[i] == '?' ? 'C' : coltypes[i], "sbcs");
		hf.write_shift(4, j);
		hf.write_shift(1, colwidths[i] || _RLEN[coltypes[i]] || 0);
		hf.write_shift(1, coldecimals[i] || 0);
		hf.write_shift(1, 0x02);
		hf.write_shift(4, 0);
		hf.write_shift(1, 0);
		hf.write_shift(4, 0);
		hf.write_shift(4, 0);
		j += (colwidths[i] || _RLEN[coltypes[i]] || 0);
	}

	var hb = ba.next(264);
	hb.write_shift(4, 0x0000000D);
	for(i=0; i < 65;++i) hb.write_shift(4, 0x00000000);
	for(i=0; i < data.length; ++i) {
		var rout = ba.next(rlen);
		rout.write_shift(1, 0);
		for(j=0; j<headers.length; ++j) {
			if(headers[j] == null) continue;
			switch(coltypes[j]) {
				case 'L': rout.write_shift(1, data[i][j] == null ? 0x3F : data[i][j] ? 0x54 : 0x46); break;
				case 'B': rout.write_shift(8, data[i][j]||0, 'f'); break;
				case 'N':
					var _n = "0";
					if(typeof data[i][j] == "number") _n = data[i][j].toFixed(coldecimals[j]||0);
					if(_n.length > colwidths[j]) _n = _n.slice(0, colwidths[j]); // addresses decimal > width
					for(hcnt=0; hcnt < colwidths[j]-_n.length; ++hcnt) rout.write_shift(1, 0x20);
					rout.write_shift(1, _n, "sbcs");
					break;
				case 'D':
					if(!data[i][j]) rout.write_shift(8, "00000000", "sbcs");
					else {
						rout.write_shift(4, ("0000"+data[i][j].getFullYear()).slice(-4), "sbcs");
						rout.write_shift(2, ("00"+(data[i][j].getMonth()+1)).slice(-2), "sbcs");
						rout.write_shift(2, ("00"+data[i][j].getDate()).slice(-2), "sbcs");
					} break;
				case 'C':
					var _l = rout.l;
					var _s = String(data[i][j] != null ? data[i][j] : "").slice(0, colwidths[j]);
					rout.write_shift(1, _s, "cpstr");
					_l += colwidths[j] - rout.l;
					for(hcnt=0; hcnt < _l; ++hcnt) rout.write_shift(1, 0x20); break;
			}
		}
		// data
	}
	current_codepage = old_cp;
	ba.next(1).write_shift(1, 0x1A);
	return ba.end();
}
	return {
		to_workbook: dbf_to_workbook,
		to_sheet: dbf_to_sheet,
		from_sheet: sheet_to_dbf
	};
})();

var SYLK = /*#__PURE__*/(function() {
	/* TODO: stress test sequences */
	var sylk_escapes = ({
		AA:'À', BA:'Á', CA:'Â', DA:195, HA:'Ä', JA:197,
		AE:'È', BE:'É', CE:'Ê',         HE:'Ë',
		AI:'Ì', BI:'Í', CI:'Î',         HI:'Ï',
		AO:'Ò', BO:'Ó', CO:'Ô', DO:213, HO:'Ö',
		AU:'Ù', BU:'Ú', CU:'Û',         HU:'Ü',
		Aa:'à', Ba:'á', Ca:'â', Da:227, Ha:'ä', Ja:229,
		Ae:'è', Be:'é', Ce:'ê',         He:'ë',
		Ai:'ì', Bi:'í', Ci:'î',         Hi:'ï',
		Ao:'ò', Bo:'ó', Co:'ô', Do:245, Ho:'ö',
		Au:'ù', Bu:'ú', Cu:'û',         Hu:'ü',
		KC:'Ç', Kc:'ç', q:'æ',  z:'œ',  a:'Æ',  j:'Œ',
		DN:209, Dn:241, Hy:255,
		S:169,  c:170,  R:174,  "B ":180,
		0:176,  1:177,  2:178,
		3:179,  5:181,  6:182,
		7:183,  Q:185,  k:186,  b:208,  i:216,  l:222,  s:240,  y:248,
		"!":161, '"':162, "#":163, "(":164, "%":165, "'":167, "H ":168,
		"+":171, ";":187, "<":188, "=":189, ">":190, "?":191, "{":223
	}/*:any*/);
	var sylk_char_regex = new RegExp("\u001BN(" + keys(sylk_escapes).join("|").replace(/\|\|\|/, "|\\||").replace(/([?()+])/g,"\\$1").replace("{", "\\{") + "|\\|)", "gm");
	try {
		sylk_char_regex = new RegExp("\u001BN(" + keys(sylk_escapes).join("|").replace(/\|\|\|/, "|\\||").replace(/([?()+])/g,"\\$1") + "|\\|)", "gm");
	} catch(e) {}
	var sylk_char_fn = function(_, $1){ var o = sylk_escapes[$1]; return typeof o == "number" ? _getansi(o) : o; };
	var decode_sylk_char = function($$, $1, $2) { var newcc = (($1.charCodeAt(0) - 0x20)<<4) | ($2.charCodeAt(0) - 0x30); return newcc == 59 ? $$ : _getansi(newcc); };
	sylk_escapes["|"] = 254;
	/* TODO: evert the escape map */
	var encode_sylk_str = function($$) { return $$.replace(/\n/g, "\x1b :").replace(/\r/g, "\x1b ="); };
	/* https://oss.sheetjs.com/notes/sylk/ for more details */
	function sylk_to_aoa(d/*:RawData*/, opts)/*:[AOA, Worksheet]*/ {
		switch(opts.type) {
			case 'base64': return sylk_to_aoa_str(Base64_decode(d), opts);
			case 'binary': return sylk_to_aoa_str(d, opts);
			case 'buffer': return sylk_to_aoa_str(has_buf && Buffer.isBuffer(d) ? d.toString('binary') : a2s(d), opts);
			case 'array': return sylk_to_aoa_str(cc2str(d), opts);
		}
		throw new Error("Unrecognized type " + opts.type);
	}
	function sylk_to_aoa_str(str/*:string*/, opts)/*:[AOA, Worksheet]*/ {
		var records = str.split(/[\n\r]+/), R = -1, C = -1, ri = 0, rj = 0, arr/*:AOA*/ = [];
		var formats/*:Array<string>*/ = [];
		var next_cell_format/*:string|null*/ = null;
		var sht = {}, rowinfo/*:Array<RowInfo>*/ = [], colinfo/*:Array<ColInfo>*/ = [], cw/*:Array<string>*/ = [];
		var Mval = 0, j;
		var wb = { Workbook: { WBProps: {}, Names: [] } };
		if(+opts.codepage >= 0) set_cp(+opts.codepage);
		for (; ri !== records.length; ++ri) {
			Mval = 0;
			var rstr=records[ri].trim().replace(/\x1B([\x20-\x2F])([\x30-\x3F])/g, decode_sylk_char).replace(sylk_char_regex, sylk_char_fn);
			var record=rstr.replace(/;;/g, "\u0000").split(";").map(function(x) { return x.replace(/\u0000/g, ";"); });
			var RT=record[0], val;
			if(rstr.length > 0) switch(RT) {
			case 'ID': break; /* header */
			case 'E': break; /* EOF */
			case 'B': break; /* dimensions */
			case 'O': /* workbook options */
			for(rj=1; rj<record.length; ++rj) switch(record[rj].charAt(0)) {
				case 'V': {
					var d1904 = parseInt(record[rj].slice(1), 10);
					// NOTE: it is technically an error if d1904 >= 5 or < 0
					if(d1904 >= 1 && d1904 <= 4) wb.Workbook.WBProps.date1904 = true;
				} break;
			} break;
			case 'W': break; /* window */
			case 'P':
				switch(record[1].charAt(0)){
					case 'P': formats.push(rstr.slice(3).replace(/;;/g, ";")); break;
				} break;
			case 'NN': { /* defined name */
				var nn = {Sheet: 0};
				for(rj=1; rj<record.length; ++rj) switch(record[rj].charAt(0)) {
					case 'N': nn.Name = record[rj].slice(1); break;
					case 'E': nn.Ref = (opts && opts.sheet || "Sheet1") + "!" + rc_to_a1(record[rj].slice(1)); break;
				}
				wb.Workbook.Names.push(nn);
			} break;
			// case 'NE': // ??
			// case 'NU': // ??
			case 'C': /* cell */
			var C_seen_K = false, C_seen_X = false, C_seen_S = false, C_seen_E = false, _R = -1, _C = -1, formula = "", cell_t = "z";
			var cmnt = "";
			for(rj=1; rj<record.length; ++rj) switch(record[rj].charAt(0)) {
				case 'A': cmnt = record[rj].slice(1); break; // TODO: comment
				case 'X': C = parseInt(record[rj].slice(1), 10)-1; C_seen_X = true; break;
				case 'Y':
					R = parseInt(record[rj].slice(1), 10)-1; if(!C_seen_X) C = 0;
					for(j = arr.length; j <= R; ++j) arr[j] = [];
					break;
				case 'K':
					val = record[rj].slice(1);
					if(val.charAt(0) === '"') { val = val.slice(1,val.length - 1); cell_t = "s"; }
					else if(val === 'TRUE' || val === 'FALSE') { val = val === 'TRUE'; cell_t = "b"; }
					else if(val.charAt(0) == "#" && RBErr[val] != null) { cell_t = "e"; val = RBErr[val]; }
					else if(!isNaN(fuzzynum(val))) {
						val = fuzzynum(val); cell_t = "n";
						if(next_cell_format !== null && fmt_is_date(next_cell_format) && opts.cellDates) {
							val = numdate(wb.Workbook.WBProps.date1904 ? val + 1462 : val); cell_t = typeof val == "number" ? "n" : "d";
						}
					}
					if(typeof $cptable !== 'undefined' && typeof val == "string" && ((opts||{}).type != "string") && (opts||{}).codepage) val = $cptable.utils.decode(opts.codepage, val);
					C_seen_K = true;
					break;
				case 'E':
					C_seen_E = true;
					formula = rc_to_a1(record[rj].slice(1), {r:R,c:C});
					break;
				case 'S':
					C_seen_S = true;
					break;
				case 'G': break; // unknown
				case 'R': _R = parseInt(record[rj].slice(1), 10)-1; break;
				case 'C': _C = parseInt(record[rj].slice(1), 10)-1; break;
				// case 'P': // ??
				// case 'D': // ??
				default: if(opts && opts.WTF) throw new Error("SYLK bad record " + rstr);
			}
			if(C_seen_K) {
				if(!arr[R][C]) arr[R][C] = { t: cell_t, v: val };
				else { arr[R][C].t = cell_t; arr[R][C].v = val; }
				if(next_cell_format) arr[R][C].z = next_cell_format;
				if(opts.cellText !== false && next_cell_format) arr[R][C].w = SSF_format(arr[R][C].z, arr[R][C].v, { date1904: wb.Workbook.WBProps.date1904 });
				next_cell_format = null;
			}
			if(C_seen_S) {
				if(C_seen_E) throw new Error("SYLK shared formula cannot have own formula");
				var shrbase = _R > -1 && arr[_R][_C];
				if(!shrbase || !shrbase[1]) throw new Error("SYLK shared formula cannot find base");
				formula = shift_formula_str(shrbase[1], {r: R - _R, c: C - _C});
			}
			if(formula) {
				if(!arr[R][C]) arr[R][C] = { t: 'n', f: formula };
				else arr[R][C].f = formula;
			}
			if(cmnt) {
				if(!arr[R][C]) arr[R][C] = { t: 'z' };
				arr[R][C].c = [{a:"SheetJSYLK", t: cmnt}];
			}
			break;
			case 'F': /* Format */
			var F_seen = 0;
			for(rj=1; rj<record.length; ++rj) switch(record[rj].charAt(0)) {
				case 'X': C = parseInt(record[rj].slice(1), 10)-1; ++F_seen; break;
				case 'Y':
					R = parseInt(record[rj].slice(1), 10)-1; /*C = 0;*/
					for(j = arr.length; j <= R; ++j) arr[j] = [];
					break;
				case 'M': Mval = parseInt(record[rj].slice(1), 10) / 20; break;
				case 'F': break; /* ??? */
				case 'G': break; /* hide grid */
				case 'P':
					next_cell_format = formats[parseInt(record[rj].slice(1), 10)];
					break;
				case 'S': break; /* cell style */
				case 'D': break; /* column */
				case 'N': break; /* font */
				case 'W':
					cw = record[rj].slice(1).split(" ");
					for(j = parseInt(cw[0], 10); j <= parseInt(cw[1], 10); ++j) {
						Mval = parseInt(cw[2], 10);
						colinfo[j-1] = Mval === 0 ? {hidden:true}: {wch:Mval};
					} break;
				case 'C': /* default column format */
					C = parseInt(record[rj].slice(1), 10)-1;
					if(!colinfo[C]) colinfo[C] = {};
					break;
				case 'R': /* row properties */
					R = parseInt(record[rj].slice(1), 10)-1;
					if(!rowinfo[R]) rowinfo[R] = {};
					if(Mval > 0) { rowinfo[R].hpt = Mval; rowinfo[R].hpx = pt2px(Mval); }
					else if(Mval === 0) rowinfo[R].hidden = true;
					break;
				// case 'K': // ??
				// case 'E': // ??
				default: if(opts && opts.WTF) throw new Error("SYLK bad record " + rstr);
			}
			if(F_seen < 1) next_cell_format = null; break;
			default: if(opts && opts.WTF) throw new Error("SYLK bad record " + rstr);
			}
		}
		if(rowinfo.length > 0) sht['!rows'] = rowinfo;
		if(colinfo.length > 0) sht['!cols'] = colinfo;
		colinfo.forEach(function(col) { process_col(col); });
		if(opts && opts.sheetRows) arr = arr.slice(0, opts.sheetRows);
		return [arr, sht, wb];
	}

	function sylk_to_workbook(d/*:RawData*/, opts)/*:Workbook*/ {
		var aoasht = sylk_to_aoa(d, opts);
		var aoa = aoasht[0], ws = aoasht[1], wb = aoasht[2];
		var _opts = dup(opts); _opts.date1904 = (((wb||{}).Workbook || {}).WBProps || {}).date1904;
		var o = aoa_to_sheet(aoa, _opts);
		keys(ws).forEach(function(k) { o[k] = ws[k]; });
		var outwb = sheet_to_workbook(o, opts);
		keys(wb).forEach(function(k) { outwb[k] = wb[k]; });
		outwb.bookType = "sylk";
		return outwb;
	}

	function write_ws_cell_sylk(cell/*:Cell*/, ws/*:Worksheet*/, R/*:number*/, C/*:number*/, opts, date1904/*:boolean*/)/*:string*/ {
		var o = "C;Y" + (R+1) + ";X" + (C+1) + ";K";
		switch(cell.t) {
			case 'n':
				o += (cell.v||0);
				if(cell.f && !cell.F) o += ";E" + a1_to_rc(cell.f, {r:R, c:C}); break;
			case 'b': o += cell.v ? "TRUE" : "FALSE"; break;
			case 'e': o += cell.w || BErr[cell.v] || cell.v; break;
			case 'd': o += datenum(parseDate(cell.v, date1904), date1904); break;
			case 's': o += '"' + (cell.v == null ? "" : String(cell.v)).replace(/"/g,"").replace(/;/g, ";;") + '"'; break;
		}
		return o;
	}

	function write_ws_cmnt_sylk(cmnt/*:Comment*/, R/*:number*/, C/*:number*/)/*:string*/ {
		var o = "C;Y" + (R+1) + ";X" + (C+1) + ";A";
		/* TODO: max length? */
		o += encode_sylk_str(cmnt.map(function(c) { return c.t; }).join(""));
		return o;
	}

	function write_ws_cols_sylk(out, cols) {
		cols.forEach(function(col, i) {
			var rec = "F;W" + (i+1) + " " + (i+1) + " ";
			if(col.hidden) rec += "0";
			else {
				if(typeof col.width == 'number' && !col.wpx) col.wpx = width2px(col.width);
				if(typeof col.wpx == 'number' && !col.wch) col.wch = px2char(col.wpx);
				if(typeof col.wch == 'number') rec += Math.round(col.wch);
			}
			if(rec.charAt(rec.length - 1) != " ") out.push(rec);
		});
	}

	function write_ws_rows_sylk(out/*:Array<string>*/, rows/*:Array<RowInfo>*/) {
		rows.forEach(function(row, i) {
			var rec = "F;";
			if(row.hidden) rec += "M0;";
			else if(row.hpt) rec += "M" + 20 * row.hpt + ";";
			else if(row.hpx) rec += "M" + 20 * px2pt(row.hpx) + ";";
			if(rec.length > 2) out.push(rec + "R" + (i+1));
		});
	}

	function sheet_to_sylk(ws/*:Worksheet*/, opts/*:?any*/, wb/*:?WorkBook*/)/*:string*/ {
		if(!opts) opts = {}; opts._formats = ["General"];
		/* TODO: codepage */
		var preamble/*:Array<string>*/ = ["ID;PSheetJS;N;E"], o/*:Array<string>*/ = [];
		var r = safe_decode_range(ws['!ref']||"A1"), cell/*:Cell*/;
		var dense = ws["!data"] != null;
		var RS = "\r\n";
		var d1904 = (((wb||{}).Workbook||{}).WBProps||{}).date1904;

		var _lastfmt = "General";
		preamble.push("P;PGeneral");
		/* Excel has been inconsistent in comment placement */
		var R = r.s.r, C = r.s.c, p = [];
		if(ws["!ref"]) for(R = r.s.r; R <= r.e.r; ++R) {
			if(dense && !ws["!data"][R]) continue;
			p = [];
			for(C = r.s.c; C <= r.e.c; ++C) {
				cell = dense ? ws["!data"][R][C] : ws[encode_col(C) + encode_row(R)];
				if(!cell || !cell.c) continue;
				p.push(write_ws_cmnt_sylk(cell.c, R, C));
			}
			if(p.length) o.push(p.join(RS));
		}
		if(ws["!ref"]) for(R = r.s.r; R <= r.e.r; ++R) {
			if(dense && !ws["!data"][R]) continue;
			p = [];
			for(C = r.s.c; C <= r.e.c; ++C) {
				cell = dense ? ws["!data"][R][C] : ws[encode_col(C) + encode_row(R)];
				if(!cell || (cell.v == null && (!cell.f || cell.F))) continue;
				if((cell.z||(cell.t == "d" ? table_fmt[14] : "General")) != _lastfmt) {
					var ifmt = opts._formats.indexOf(cell.z);
					if(ifmt == -1) { opts._formats.push(cell.z); ifmt = opts._formats.length - 1; preamble.push("P;P" + cell.z.replace(/;/g, ";;")); }
					p.push("F;P" + ifmt + ";Y" + (R+1) + ";X" + (C+1));
				}
				p.push(write_ws_cell_sylk(cell, ws, R, C, opts, d1904));
			}
			o.push(p.join(RS));
		}

		preamble.push("F;P0;DG0G8;M255");
		if(ws['!cols']) write_ws_cols_sylk(preamble, ws['!cols']);
		if(ws['!rows']) write_ws_rows_sylk(preamble, ws['!rows']);

		if(ws["!ref"]) preamble.push("B;Y" + (r.e.r - r.s.r + 1) + ";X" + (r.e.c - r.s.c + 1) + ";D" + [r.s.c,r.s.r,r.e.c,r.e.r].join(" "));
		preamble.push("O;L;D;B" + (d1904 ? ";V4" : "") + ";K47;G100 0.001");

		delete opts._formats;
		return preamble.join(RS) + RS + o.join(RS) + RS + "E" + RS;
	}

	return {
		to_workbook: sylk_to_workbook,
		from_sheet: sheet_to_sylk
	};
})();

var DIF = /*#__PURE__*/(function() {
	function dif_to_aoa(d/*:RawData*/, opts)/*:AOA*/ {
		switch(opts.type) {
			case 'base64': return dif_to_aoa_str(Base64_decode(d), opts);
			case 'binary': return dif_to_aoa_str(d, opts);
			case 'buffer': return dif_to_aoa_str(has_buf && Buffer.isBuffer(d) ? d.toString('binary') : a2s(d), opts);
			case 'array': return dif_to_aoa_str(cc2str(d), opts);
		}
		throw new Error("Unrecognized type " + opts.type);
	}
	function dif_to_aoa_str(str/*:string*/, opts)/*:AOA*/ {
		var records = str.split('\n'), R = -1, C = -1, ri = 0, arr/*:AOA*/ = [];
		for (; ri !== records.length; ++ri) {
			if (records[ri].trim() === 'BOT') { arr[++R] = []; C = 0; continue; }
			if (R < 0) continue;
			var metadata = records[ri].trim().split(",");
			var type = metadata[0], value = metadata[1];
			++ri;
			var data = records[ri] || "";
			while(((data.match(/["]/g)||[]).length & 1) && ri < records.length - 1) data += "\n" + records[++ri];
			data = data.trim();
			switch (+type) {
				case -1:
					if (data === 'BOT') { arr[++R] = []; C = 0; continue; }
					else if (data !== 'EOD') throw new Error("Unrecognized DIF special command " + data);
					break;
				case 0:
					if(data === 'TRUE') arr[R][C] = true;
					else if(data === 'FALSE') arr[R][C] = false;
					else if(!isNaN(fuzzynum(value))) arr[R][C] = fuzzynum(value);
					else if(!isNaN(fuzzydate(value).getDate())) {
						arr[R][C] = parseDate(value);
						if(!(opts && opts.UTC)) { arr[R][C] = utc_to_local(arr[R][C]); }
					}
					else arr[R][C] = value;
					++C; break;
				case 1:
					data = data.slice(1,data.length-1);
					data = data.replace(/""/g, '"');
					if(DIF_XL && data && data.match(/^=".*"$/)) data = data.slice(2, -1);
					arr[R][C++] = data !== '' ? data : null;
					break;
			}
			if (data === 'EOD') break;
		}
		if(opts && opts.sheetRows) arr = arr.slice(0, opts.sheetRows);
		return arr;
	}

	function dif_to_sheet(str/*:string*/, opts)/*:Worksheet*/ { return aoa_to_sheet(dif_to_aoa(str, opts), opts); }
	function dif_to_workbook(str/*:string*/, opts)/*:Workbook*/ {
		var o = sheet_to_workbook(dif_to_sheet(str, opts), opts);
		o.bookType = "dif";
		return o;
	}

	function make_value(v/*:number*/, s/*:string*/)/*:string*/ { return "0," + String(v) + "\r\n" + s; }
	function make_value_str(s/*:string*/)/*:string*/ { return "1,0\r\n\"" + s.replace(/"/g,'""') + '"'; }
	function sheet_to_dif(ws/*:Worksheet*//*::, opts:?any*/)/*:string*/ {
		var _DIF_XL = DIF_XL;
		if(!ws["!ref"]) throw new Error("Cannot export empty sheet to DIF");
		var r = safe_decode_range(ws['!ref']);
		var dense = ws["!data"] != null;
		var o/*:Array<string>*/ = [
			"TABLE\r\n0,1\r\n\"sheetjs\"\r\n",
			"VECTORS\r\n0," + (r.e.r - r.s.r + 1) + "\r\n\"\"\r\n",
			"TUPLES\r\n0," + (r.e.c - r.s.c + 1) + "\r\n\"\"\r\n",
			"DATA\r\n0,0\r\n\"\"\r\n"
		];
		for(var R = r.s.r; R <= r.e.r; ++R) {
			var row = dense ? ws["!data"][R] : [];
			var p = "-1,0\r\nBOT\r\n";
			for(var C = r.s.c; C <= r.e.c; ++C) {
				var cell/*:Cell*/ = dense ? (row && row[C]) : ws[encode_cell({r:R,c:C})];
				if(cell == null) { p +=("1,0\r\n\"\"\r\n"); continue;}
				switch(cell.t) {
					case 'n':
						if(_DIF_XL) {
							if(cell.w != null) p +=("0," + cell.w + "\r\nV");
							else if(cell.v != null) p +=(make_value(cell.v, "V")); // TODO: should this call SSF_format?
							else if(cell.f != null && !cell.F) p +=(make_value_str("=" + cell.f));
							else p +=("1,0\r\n\"\"");
						} else {
							if(cell.v == null) p +=("1,0\r\n\"\"");
							else p +=(make_value(cell.v, "V"));
						}
						break;
					case 'b':
						p +=(cell.v ? make_value(1, "TRUE") : make_value(0, "FALSE"));
						break;
					case 's':
						p +=(make_value_str((!_DIF_XL || isNaN(+cell.v)) ? cell.v : '="' + cell.v + '"'));
						break;
					case 'd':
						if(!cell.w) cell.w = SSF_format(cell.z || table_fmt[14], datenum(parseDate(cell.v)));
						if(_DIF_XL) p +=(make_value(cell.w, "V"));
						else p +=(make_value_str(cell.w));
						break;
					default: p +=("1,0\r\n\"\"");
				}
				p += "\r\n";
			}
			o.push(p);
		}
		return o.join("") + "-1,0\r\nEOD";
	}
	return {
		to_workbook: dif_to_workbook,
		to_sheet: dif_to_sheet,
		from_sheet: sheet_to_dif
	};
})();

var ETH = /*#__PURE__*/(function() {
	function decode(s/*:string*/)/*:string*/ { return s.replace(/\\b/g,"\\").replace(/\\c/g,":").replace(/\\n/g,"\n"); }
	function encode(s/*:string*/)/*:string*/ { return s.replace(/\\/g, "\\b").replace(/:/g, "\\c").replace(/\n/g,"\\n"); }

	function eth_to_aoa(str/*:string*/, opts)/*:AOA*/ {
		var records = str.split('\n'), R = -1, C = -1, ri = 0, arr/*:AOA*/ = [];
		for (; ri !== records.length; ++ri) {
			var record = records[ri].trim().split(":");
			if(record[0] !== 'cell') continue;
			var addr = decode_cell(record[1]);
			if(arr.length <= addr.r) for(R = arr.length; R <= addr.r; ++R) if(!arr[R]) arr[R] = [];
			R = addr.r; C = addr.c;
			switch(record[2]) {
				case 't': arr[R][C] = decode(record[3]); break;
				case 'v': arr[R][C] = +record[3]; break;
				case 'vtf': var _f = record[record.length - 1];
					/* falls through */
				case 'vtc':
					switch(record[3]) {
						case 'nl': arr[R][C] = +record[4] ? true : false; break;
						default: arr[R][C] = +record[4]; break;
					}
					if(record[2] == 'vtf') arr[R][C] = [arr[R][C], _f];
			}
		}
		if(opts && opts.sheetRows) arr = arr.slice(0, opts.sheetRows);
		return arr;
	}

	function eth_to_sheet(d/*:string*/, opts)/*:Worksheet*/ { return aoa_to_sheet(eth_to_aoa(d, opts), opts); }
	function eth_to_workbook(d/*:string*/, opts)/*:Workbook*/ { return sheet_to_workbook(eth_to_sheet(d, opts), opts); }

	var header = [
		"socialcalc:version:1.5",
		"MIME-Version: 1.0",
		"Content-Type: multipart/mixed; boundary=SocialCalcSpreadsheetControlSave"
	].join("\n");

	var sep = [
		"--SocialCalcSpreadsheetControlSave",
		"Content-type: text/plain; charset=UTF-8"
	].join("\n") + "\n";

	/* TODO: the other parts */
	var meta = [
		"# SocialCalc Spreadsheet Control Save",
		"part:sheet"
	].join("\n");

	var end = "--SocialCalcSpreadsheetControlSave--";

	function sheet_to_eth_data(ws/*:Worksheet*/)/*:string*/ {
		if(!ws || !ws['!ref']) return "";
		var o/*:Array<string>*/ = [], oo/*:Array<string>*/ = [], cell, coord = "";
		var r = decode_range(ws['!ref']);
		var dense = ws["!data"] != null;
		for(var R = r.s.r; R <= r.e.r; ++R) {
			for(var C = r.s.c; C <= r.e.c; ++C) {
				coord = encode_cell({r:R,c:C});
				cell = dense ? (ws["!data"][R]||[])[C] : ws[coord];
				if(!cell || cell.v == null || cell.t === 'z') continue;
				oo = ["cell", coord, 't'];
				switch(cell.t) {
					case 's': case 'str': oo.push(encode(cell.v)); break;
					case 'n':
						if(!cell.f) { oo[2]='v'; oo[3]=cell.v; }
						else { oo[2]='vtf'; oo[3]='n'; oo[4]=cell.v; oo[5]=encode(cell.f); }
						break;
					case 'b':
						oo[2] = 'vt'+(cell.f?'f':'c'); oo[3]='nl'; oo[4]=cell.v?"1":"0";
						oo[5] = encode(cell.f||(cell.v?'TRUE':'FALSE'));
						break;
					case 'd':
						var t = datenum(parseDate(cell.v));
						oo[2] = 'vtc'; oo[3] = 'nd'; oo[4] = ""+t;
						oo[5] = cell.w || SSF_format(cell.z || table_fmt[14], t);
						break;
					case 'e': continue;
				}
				o.push(oo.join(":"));
			}
		}
		o.push("sheet:c:" + (r.e.c-r.s.c+1) + ":r:" + (r.e.r-r.s.r+1) + ":tvf:1");
		o.push("valueformat:1:text-wiki");
		//o.push("copiedfrom:" + ws['!ref']); // clipboard only
		return o.join("\n");
	}

	function sheet_to_eth(ws/*:Worksheet*//*::, opts:?any*/)/*:string*/ {
		return [header, sep, meta, sep, sheet_to_eth_data(ws), end].join("\n");
		// return ["version:1.5", sheet_to_eth_data(ws)].join("\n"); // clipboard form
	}

	return {
		to_workbook: eth_to_workbook,
		to_sheet: eth_to_sheet,
		from_sheet: sheet_to_eth
	};
})();

var PRN = /*#__PURE__*/(function() {
	function set_text_arr(data/*:string*/, arr/*:AOA*/, R/*:number*/, C/*:number*/, o/*:any*/) {
		if(o.raw) arr[R][C] = data;
		else if(data === ""){/* empty */}
		else if(data === 'TRUE') arr[R][C] = true;
		else if(data === 'FALSE') arr[R][C] = false;
		else if(!isNaN(fuzzynum(data))) arr[R][C] = fuzzynum(data);
		else if(!isNaN(fuzzydate(data).getDate())) arr[R][C] = parseDate(data);
		else arr[R][C] = data;
	}

	function prn_to_aoa_str(f/*:string*/, opts)/*:AOA*/ {
		var o = opts || {};
		var arr/*:AOA*/ = ([]/*:any*/);
		if(!f || f.length === 0) return arr;
		var lines = f.split(/[\r\n]/);
		var L = lines.length - 1;
		while(L >= 0 && lines[L].length === 0) --L;
		var start = 10, idx = 0;
		var R = 0;
		for(; R <= L; ++R) {
			idx = lines[R].indexOf(" ");
			if(idx == -1) idx = lines[R].length; else idx++;
			start = Math.max(start, idx);
		}
		for(R = 0; R <= L; ++R) {
			arr[R] = [];
			/* TODO: confirm that widths are always 10 */
			var C = 0;
			set_text_arr(lines[R].slice(0, start).trim(), arr, R, C, o);
			for(C = 1; C <= (lines[R].length - start)/10 + 1; ++C)
				set_text_arr(lines[R].slice(start+(C-1)*10,start+C*10).trim(),arr,R,C,o);
		}
		if(o.sheetRows) arr = arr.slice(0, o.sheetRows);
		return arr;
	}

	// List of accepted CSV separators
	var guess_seps = {
		0x2C: ',',
		0x09: "\t",
		0x3B: ';',
		0x7C: '|'
	};

	// CSV separator weights to be used in case of equal numbers
	var guess_sep_weights = {
		0x2C: 3,
		0x09: 2,
		0x3B: 1,
		0x7C: 0
	};

	function guess_sep(str) {
		var cnt = {}, instr = false, end = 0, cc = 0;
		for(;end < str.length;++end) {
			if((cc=str.charCodeAt(end)) == 0x22) instr = !instr;
			else if(!instr && cc in guess_seps) cnt[cc] = (cnt[cc]||0)+1;
		}

		cc = [];
		for(end in cnt) if ( Object.prototype.hasOwnProperty.call(cnt, end) ) {
			cc.push([ cnt[end], end ]);
		}

		if ( !cc.length ) {
			cnt = guess_sep_weights;
			for(end in cnt) if ( Object.prototype.hasOwnProperty.call(cnt, end) ) {
				cc.push([ cnt[end], end ]);
			}
		}

		cc.sort(function(a, b) { return a[0] - b[0] || guess_sep_weights[a[1]] - guess_sep_weights[b[1]]; });

		return guess_seps[cc.pop()[1]] || 0x2C;
	}

	function dsv_to_sheet_str(str/*:string*/, opts)/*:Worksheet*/ {
		var o = opts || {};
		var sep = "";
		if(DENSE != null && o.dense == null) o.dense = DENSE;
		var ws/*:Worksheet*/ = ({}/*:any*/);
		if(o.dense) ws["!data"] = [];
		var range/*:Range*/ = ({s: {c:0, r:0}, e: {c:0, r:0}}/*:any*/);

		if(str.slice(0,4) == "sep=") {
			// If the line ends in \r\n
			if(str.charCodeAt(5) == 13 && str.charCodeAt(6) == 10 ) {
				sep = str.charAt(4); str = str.slice(7);
			}
			// If line ends in \r OR \n
			else if(str.charCodeAt(5) == 13 || str.charCodeAt(5) == 10 ) {
				sep = str.charAt(4); str = str.slice(6);
			}
			else sep = guess_sep(str.slice(0,1024));
		}
		else if(o && o.FS) sep = o.FS;
		else sep = guess_sep(str.slice(0,1024));
		var R = 0, C = 0, v = 0;
		var start = 0, end = 0, sepcc = sep.charCodeAt(0), instr = false, cc=0, startcc=str.charCodeAt(0);
		var _re/*:?RegExp*/ = o.dateNF != null ? dateNF_regex(o.dateNF) : null;
		function finish_cell() {
			/* TODO: fuzzy parsers should pass back assumed number format */
			var s = str.slice(start, end); if(s.slice(-1) == "\r") s = s.slice(0, -1);
			var cell = ({}/*:any*/);
			if(s.charAt(0) == '"' && s.charAt(s.length - 1) == '"') s = s.slice(1,-1).replace(/""/g,'"');
			if(o.cellText !== false) cell.w = s;
			if(s.length === 0) cell.t = 'z';
			else if(o.raw) { cell.t = 's'; cell.v = s; }
			else if(s.trim().length === 0) { cell.t = 's'; cell.v = s; }
			else if(s.charCodeAt(0) == 0x3D) {
				if(s.charCodeAt(1) == 0x22 && s.charCodeAt(s.length - 1) == 0x22) { cell.t = 's'; cell.v = s.slice(2,-1).replace(/""/g,'"'); }
				else if(fuzzyfmla(s)) { cell.t = 's'; cell.f = s.slice(1); cell.v = s; }
				else { cell.t = 's'; cell.v = s; } }
			else if(s == "TRUE") { cell.t = 'b'; cell.v = true; }
			else if(s == "FALSE") { cell.t = 'b'; cell.v = false; }
			else if(!isNaN(v = fuzzynum(s))) { cell.t = 'n'; cell.v = v; }
			else if(!isNaN((v = fuzzydate(s)).getDate()) || _re && s.match(_re)) {
				cell.z = o.dateNF || table_fmt[14];
				if(_re && s.match(_re)){ var news=dateNF_fix(s, o.dateNF, (s.match(_re)||[])); v = parseDate(news); if(o && o.UTC === false) v = utc_to_local(v); }
				else if(o && o.UTC === false) v = utc_to_local(v);
				else if(o.cellText !== false && o.dateNF) cell.w = SSF_format(cell.z, v);
				if(o.cellDates) { cell.t = 'd'; cell.v = v; }
				else { cell.t = 'n'; cell.v = datenum(v); }
				if(!o.cellNF) delete cell.z;
			} else {
				cell.t = 's';
				cell.v = s;
			}
			if(cell.t == 'z'){}
			else if(o.dense) { if(!ws["!data"][R]) ws["!data"][R] = []; ws["!data"][R][C] = cell; }
			else ws[encode_cell({c:C,r:R})] = cell;
			start = end+1; startcc = str.charCodeAt(start);
			if(range.e.c < C) range.e.c = C;
			if(range.e.r < R) range.e.r = R;
			if(cc == sepcc) ++C; else { C = 0; ++R; if(o.sheetRows && o.sheetRows <= R) return true; }
		}
		outer: for(;end < str.length;++end) switch((cc=str.charCodeAt(end))) {
			case 0x22: if(startcc === 0x22) instr = !instr; break;
			case 0x0d:
				if(instr) break;
				if(str.charCodeAt(end+1) == 0x0a) ++end;
				/* falls through */
			case sepcc: case 0x0a: if(!instr && finish_cell()) break outer; break;
			default: break;
		}
		if(end - start > 0) finish_cell();

		ws['!ref'] = encode_range(range);
		return ws;
	}

	function prn_to_sheet_str(str/*:string*/, opts)/*:Worksheet*/ {
		if(!(opts && opts.PRN)) return dsv_to_sheet_str(str, opts);
		if(opts.FS) return dsv_to_sheet_str(str, opts);
		if(str.slice(0,4) == "sep=") return dsv_to_sheet_str(str, opts);
		if(str.indexOf("\t") >= 0 || str.indexOf(",") >= 0 || str.indexOf(";") >= 0) return dsv_to_sheet_str(str, opts);
		return aoa_to_sheet(prn_to_aoa_str(str, opts), opts);
	}

	function prn_to_sheet(d/*:RawData*/, opts)/*:Worksheet*/ {
		var str = "", bytes = opts.type == 'string' ? [0,0,0,0] : firstbyte(d, opts);
		switch(opts.type) {
			case 'base64': str = Base64_decode(d); break;
			case 'binary': str = d; break;
			case 'buffer':
				if(opts.codepage == 65001) str = d.toString('utf8'); // TODO: test if buf
				else if(opts.codepage && typeof $cptable !== 'undefined') str = $cptable.utils.decode(opts.codepage, d);
				else str = has_buf && Buffer.isBuffer(d) ? d.toString('binary') : a2s(d);
				break;
			case 'array': str = cc2str(d); break;
			case 'string': str = d; break;
			default: throw new Error("Unrecognized type " + opts.type);
		}
		if(bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) str = utf8read(str.slice(3));
		else if(opts.type != 'string' && opts.type != 'buffer' && opts.codepage == 65001) str = utf8read(str);
		else if((opts.type == 'binary') && typeof $cptable !== 'undefined' && opts.codepage)  str = $cptable.utils.decode(opts.codepage, $cptable.utils.encode(28591,str));
		if(str.slice(0,19) == "socialcalc:version:") return ETH.to_sheet(opts.type == 'string' ? str : utf8read(str), opts);
		return prn_to_sheet_str(str, opts);
	}

	function prn_to_workbook(d/*:RawData*/, opts)/*:Workbook*/ { return sheet_to_workbook(prn_to_sheet(d, opts), opts); }

	function sheet_to_prn(ws/*:Worksheet*//*::, opts:?any*/)/*:string*/ {
		var o/*:Array<string>*/ = [];
		if(!ws["!ref"]) return "";
		var r = safe_decode_range(ws['!ref']), cell/*:Cell*/;
		var dense = ws["!data"] != null;
		for(var R = r.s.r; R <= r.e.r; ++R) {
			var oo/*:Array<string>*/ = [];
			for(var C = r.s.c; C <= r.e.c; ++C) {
				var coord = encode_cell({r:R,c:C});
				cell = dense ? (ws["!data"][R]||[])[C] : ws[coord];
				if(!cell || cell.v == null) { oo.push("          "); continue; }
				var w = (cell.w || (format_cell(cell), cell.w) || "").slice(0,10);
				while(w.length < 10) w += " ";
				oo.push(w + (C === 0 ? " " : ""));
			}
			o.push(oo.join(""));
		}
		return o.join("\n");
	}

	return {
		to_workbook: prn_to_workbook,
		to_sheet: prn_to_sheet,
		from_sheet: sheet_to_prn
	};
})();

/* Excel defaults to SYLK but warns if data is not valid */
function read_wb_ID(d, opts) {
	var o = opts || {}, OLD_WTF = !!o.WTF; o.WTF = true;
	try {
		var out = SYLK.to_workbook(d, o);
		o.WTF = OLD_WTF;
		return out;
	} catch(e) {
		o.WTF = OLD_WTF;
		if((e.message.indexOf("SYLK bad record ID") == -1) && OLD_WTF) throw e;
		return PRN.to_workbook(d, opts);
	}
}

/* 18.4.7 rPr CT_RPrElt */
function parse_rpr(rpr) {
	var font = {}, m = rpr.match(tagregex), i = 0;
	var pass = false;
	if(m) for(;i!=m.length; ++i) {
		var y = parsexmltag(m[i]);
		switch(y[0].replace(/<\w*:/g,"<")) {
			/* 18.8.12 condense CT_BooleanProperty */
			/* ** not required . */
			case '<condense': break;
			/* 18.8.17 extend CT_BooleanProperty */
			/* ** not required . */
			case '<extend': break;
			/* 18.8.36 shadow CT_BooleanProperty */
			/* ** not required . */
			case '<shadow':
				if(!y.val) break;
				/* falls through */
			case '<shadow>':
			case '<shadow/>': font.shadow = 1; break;
			case '</shadow>': break;

			/* 18.4.1 charset CT_IntProperty TODO */
			case '<charset':
				if(y.val == '1') break;
				font.cp = CS2CP[parseInt(y.val, 10)];
				break;

			/* 18.4.2 outline CT_BooleanProperty TODO */
			case '<outline':
				if(!y.val) break;
				/* falls through */
			case '<outline>':
			case '<outline/>': font.outline = 1; break;
			case '</outline>': break;

			/* 18.4.5 rFont CT_FontName */
			case '<rFont': font.name = y.val; break;

			/* 18.4.11 sz CT_FontSize */
			case '<sz': font.sz = y.val; break;

			/* 18.4.10 strike CT_BooleanProperty */
			case '<strike':
				if(!y.val) break;
				/* falls through */
			case '<strike>':
			case '<strike/>': font.strike = 1; break;
			case '</strike>': break;

			/* 18.4.13 u CT_UnderlineProperty */
			case '<u':
				if(!y.val) break;
				switch(y.val) {
					case 'double': font.uval = "double"; break;
					case 'singleAccounting': font.uval = "single-accounting"; break;
					case 'doubleAccounting': font.uval = "double-accounting"; break;
				}
				/* falls through */
			case '<u>':
			case '<u/>': font.u = 1; break;
			case '</u>': break;

			/* 18.8.2 b */
			case '<b':
				if(y.val == '0') break;
				/* falls through */
			case '<b>':
			case '<b/>': font.b = 1; break;
			case '</b>': break;

			/* 18.8.26 i */
			case '<i':
				if(y.val == '0') break;
				/* falls through */
			case '<i>':
			case '<i/>': font.i = 1; break;
			case '</i>': break;

			/* 18.3.1.15 color CT_Color TODO: tint, theme, auto, indexed */
			case '<color':
				if(y.rgb) font.color = y.rgb.slice(2,8);
				break;
			case '<color>': case '<color/>': case '</color>': break;

			/* 18.8.18 family ST_FontFamily */
			case '<family': font.family = y.val; break;
			case '<family>': case '<family/>': case '</family>': break;

			/* 18.4.14 vertAlign CT_VerticalAlignFontProperty TODO */
			case '<vertAlign': font.valign = y.val; break;
			case '<vertAlign>': case '<vertAlign/>': case '</vertAlign>': break;

			/* 18.8.35 scheme CT_FontScheme TODO */
			case '<scheme': break;
			case '<scheme>': case '<scheme/>': case '</scheme>': break;

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': break;
			case '<ext': pass = true; break;
			case '</ext>': pass = false; break;
			default:
				if(y[0].charCodeAt(1) !== 47 && !pass) throw new Error('Unrecognized rich format ' + y[0]);
		}
	}
	return font;
}

var parse_rs = /*#__PURE__*/(function() {
	/* 18.4.4 r CT_RElt */
	function parse_r(r) {
		/* 18.4.12 t ST_Xstring */
		var t = str_match_xml_ns(r, "t")/*, cp = 65001*/;
		if(!t) return {t:"s", v:""};

		var o/*:Cell*/ = ({t:'s', v:unescapexml(t[1])}/*:any*/);
		var rpr = str_match_xml_ns(r, "rPr");
		if(rpr) o.s = parse_rpr(rpr[1]);
		return o;
	}
	var rregex = /<(?:\w+:)?r>/g, rend = /<\/(?:\w+:)?r>/;
	return function parse_rs(rs) {
		return rs.replace(rregex,"").split(rend).map(parse_r).filter(function(r) { return r.v; });
	};
})();


/* Parse a list of <r> tags */
var rs_to_html = /*#__PURE__*/(function parse_rs_factory() {
	var nlregex = /(\r\n|\n)/g;
	function parse_rpr2(font, intro, outro) {
		var style/*:Array<string>*/ = [];

		if(font.u) style.push("text-decoration: underline;");
		if(font.uval) style.push("text-underline-style:" + font.uval + ";");
		if(font.sz) style.push("font-size:" + font.sz + "pt;");
		if(font.outline) style.push("text-effect: outline;");
		if(font.shadow) style.push("text-shadow: auto;");
		intro.push('<span style="' + style.join("") + '">');

		if(font.b) { intro.push("<b>"); outro.push("</b>"); }
		if(font.i) { intro.push("<i>"); outro.push("</i>"); }
		if(font.strike) { intro.push("<s>"); outro.push("</s>"); }

		var align = font.valign || "";
		if(align == "superscript" || align == "super") align = "sup";
		else if(align == "subscript") align = "sub";
		if(align != "") { intro.push("<" + align + ">"); outro.push("</" + align + ">"); }

		outro.push("</span>");
		return font;
	}

	/* 18.4.4 r CT_RElt */
	function r_to_html(r) {
		var terms/*:[Array<string>, string, Array<string>]*/ = [[],r.v,[]];
		if(!r.v) return "";

		if(r.s) parse_rpr2(r.s, terms[0], terms[2]);

		return terms[0].join("") + terms[1].replace(nlregex,'<br/>') + terms[2].join("");
	}

	return function parse_rs(rs) {
		return rs.map(r_to_html).join("");
	};
})();

/* 18.4.8 si CT_Rst */
var sitregex = /<(?:\w+:)?t\b[^<>]*>([^<]*)<\/(?:\w+:)?t>/g, sirregex = /<(?:\w+:)?r\b[^<>]*>/;
function parse_si(x, opts) {
	var html = opts ? opts.cellHTML : true;
	var z = {};
	if(!x) return { t: "" };
	//var y;
	/* 18.4.12 t ST_Xstring (Plaintext String) */
	// TODO: is whitespace actually valid here?
	if(x.match(/^\s*<(?:\w+:)?t[^>]*>/)) {
		z.t = unescapexml(utf8read(x.slice(x.indexOf(">")+1).split(/<\/(?:\w+:)?t>/)[0]||""), true);
		z.r = utf8read(x);
		if(html) z.h = escapehtml(z.t);
	}
	/* 18.4.4 r CT_RElt (Rich Text Run) */
	else if((/*y = */x.match(sirregex))) {
		z.r = utf8read(x);
		z.t = unescapexml(utf8read((str_remove_xml_ns_g(x, "rPh").match(sitregex)||[]).join("").replace(tagregex,"")), true);
		if(html) z.h = rs_to_html(parse_rs(z.r));
	}
	/* 18.4.3 phoneticPr CT_PhoneticPr (TODO: needed for Asian support) */
	/* 18.4.6 rPh CT_PhoneticRun (TODO: needed for Asian support) */
	return z;
}

/* 18.4 Shared String Table */
var sstr1 = /<(?:\w+:)?(?:si|sstItem)>/g;
var sstr2 = /<\/(?:\w+:)?(?:si|sstItem)>/;
function parse_sst_xml(data/*:string*/, opts)/*:SST*/ {
	var s/*:SST*/ = ([]/*:any*/), ss = "";
	if(!data) return s;
	/* 18.4.9 sst CT_Sst */
	var sst = str_match_xml_ns(data, "sst");
	if(sst) {
		ss = sst[1].replace(sstr1,"").split(sstr2);
		for(var i = 0; i != ss.length; ++i) {
			var o = parse_si(ss[i].trim(), opts);
			if(o != null) s[s.length] = o;
		}
		sst = parsexmltag(sst[0].slice(0, sst[0].indexOf(">"))); s.Count = sst.count; s.Unique = sst.uniqueCount;
	}
	return s;
}

var straywsregex = /^\s|\s$|[\t\n\r]/;
function write_sst_xml(sst/*:SST*/, opts)/*:string*/ {
	if(!opts.bookSST) return "";
	var o = [XML_HEADER];
	o[o.length] = (writextag('sst', null, {
		xmlns: XMLNS_main[0],
		count: sst.Count,
		uniqueCount: sst.Unique
	}));
	for(var i = 0; i != sst.length; ++i) { if(sst[i] == null) continue;
		var s/*:XLString*/ = sst[i];
		var sitag = "<si>";
		if(s.r) sitag += s.r;
		else {
			sitag += "<t";
			if(!s.t) s.t = "";
			if(typeof s.t !== "string") s.t = String(s.t);
			if(s.t.match(straywsregex)) sitag += ' xml:space="preserve"';
			sitag += ">" + escapexml(s.t) + "</t>";
		}
		sitag += "</si>";
		o[o.length] = (sitag);
	}
	if(o.length>2){ o[o.length] = ('</sst>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
function hex2RGB(h) {
	var o = h.slice(h[0]==="#"?1:0).slice(0,6);
	return [parseInt(o.slice(0,2),16),parseInt(o.slice(2,4),16),parseInt(o.slice(4,6),16)];
}
function rgb2Hex(rgb) {
	for(var i=0,o=1; i!=3; ++i) o = o*256 + (rgb[i]>255?255:rgb[i]<0?0:rgb[i]);
	return o.toString(16).toUpperCase().slice(1);
}

function rgb2HSL(rgb) {
	var R = rgb[0]/255, G = rgb[1]/255, B=rgb[2]/255;
	var M = Math.max(R, G, B), m = Math.min(R, G, B), C = M - m;
	if(C === 0) return [0, 0, R];

	var H6 = 0, S = 0, L2 = (M + m);
	S = C / (L2 > 1 ? 2 - L2 : L2);
	switch(M){
		case R: H6 = ((G - B) / C + 6)%6; break;
		case G: H6 = ((B - R) / C + 2); break;
		case B: H6 = ((R - G) / C + 4); break;
	}
	return [H6 / 6, S, L2 / 2];
}

function hsl2RGB(hsl){
	var H = hsl[0], S = hsl[1], L = hsl[2];
	var C = S * 2 * (L < 0.5 ? L : 1 - L), m = L - C/2;
	var rgb = [m,m,m], h6 = 6*H;

	var X;
	if(S !== 0) switch(h6|0) {
		case 0: case 6: X = C * h6; rgb[0] += C; rgb[1] += X; break;
		case 1: X = C * (2 - h6);   rgb[0] += X; rgb[1] += C; break;
		case 2: X = C * (h6 - 2);   rgb[1] += C; rgb[2] += X; break;
		case 3: X = C * (4 - h6);   rgb[1] += X; rgb[2] += C; break;
		case 4: X = C * (h6 - 4);   rgb[2] += C; rgb[0] += X; break;
		case 5: X = C * (6 - h6);   rgb[2] += X; rgb[0] += C; break;
	}
	for(var i = 0; i != 3; ++i) rgb[i] = Math.round(rgb[i]*255);
	return rgb;
}

/* 18.8.3 bgColor tint algorithm */
function rgb_tint(hex, tint) {
	if(tint === 0) return hex;
	var hsl = rgb2HSL(hex2RGB(hex));
	if (tint < 0) hsl[2] = hsl[2] * (1 + tint);
	else hsl[2] = 1 - (1 - hsl[2]) * (1 - tint);
	return rgb2Hex(hsl2RGB(hsl));
}

/* 18.3.1.13 width calculations */
/* [MS-OI29500] 2.1.595 Column Width & Formatting */
var DEF_MDW = 6, MAX_MDW = 15, MIN_MDW = 1, MDW = DEF_MDW;
function width2px(width) { return Math.floor(( width + (Math.round(128/MDW))/256 )* MDW ); }
function px2char(px) { return (Math.floor((px - 5)/MDW * 100 + 0.5))/100; }
function char2width(chr) { return (Math.round((chr * MDW + 5)/MDW*256))/256; }
//function px2char_(px) { return (((px - 5)/MDW * 100 + 0.5))/100; }
//function char2width_(chr) { return (((chr * MDW + 5)/MDW*256))/256; }
function cycle_width(collw) { return char2width(px2char(width2px(collw))); }
/* XLSX/XLSB/XLS specify width in units of MDW */
function find_mdw_colw(collw) {
	var delta = Math.abs(collw - cycle_width(collw)), _MDW = MDW;
	if(delta > 0.005) for(MDW=MIN_MDW; MDW<MAX_MDW; ++MDW) if(Math.abs(collw - cycle_width(collw)) <= delta) { delta = Math.abs(collw - cycle_width(collw)); _MDW = MDW; }
	MDW = _MDW;
}
/* XLML specifies width in terms of pixels */
/*function find_mdw_wpx(wpx) {
	var delta = Infinity, guess = 0, _MDW = MIN_MDW;
	for(MDW=MIN_MDW; MDW<MAX_MDW; ++MDW) {
		guess = char2width_(px2char_(wpx))*256;
		guess = (guess) % 1;
		if(guess > 0.5) guess--;
		if(Math.abs(guess) < delta) { delta = Math.abs(guess); _MDW = MDW; }
	}
	MDW = _MDW;
}*/

function process_col(coll/*:ColInfo*/) {
	if(coll.width) {
		coll.wpx = width2px(coll.width);
		coll.wch = px2char(coll.wpx);
		coll.MDW = MDW;
	} else if(coll.wpx) {
		coll.wch = px2char(coll.wpx);
		coll.width = char2width(coll.wch);
		coll.MDW = MDW;
	} else if(typeof coll.wch == 'number') {
		coll.width = char2width(coll.wch);
		coll.wpx = width2px(coll.width);
		coll.MDW = MDW;
	}
	if(coll.customWidth) delete coll.customWidth;
}

var DEF_PPI = 96, PPI = DEF_PPI;
function px2pt(px) { return px * 96 / PPI; }
function pt2px(pt) { return pt * PPI / 96; }

/* [MS-EXSPXML3] 2.4.54 ST_enmPattern */
var XLMLPatternTypeMap = {
	"None": "none",
	"Solid": "solid",
	"Gray50": "mediumGray",
	"Gray75": "darkGray",
	"Gray25": "lightGray",
	"HorzStripe": "darkHorizontal",
	"VertStripe": "darkVertical",
	"ReverseDiagStripe": "darkDown",
	"DiagStripe": "darkUp",
	"DiagCross": "darkGrid",
	"ThickDiagCross": "darkTrellis",
	"ThinHorzStripe": "lightHorizontal",
	"ThinVertStripe": "lightVertical",
	"ThinReverseDiagStripe": "lightDown",
	"ThinHorzCross": "lightGrid"
};

/* 18.8.5 borders CT_Borders */
function parse_borders(t, styles, themes, opts) {
	styles.Borders = [];
	var border = {};
	var pass = false;
	(t.match(tagregex)||[]).forEach(function(x) {
		var y = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<borders': case '<borders>': case '</borders>': break;

			/* 18.8.4 border CT_Border */
			case '<border': case '<border>': case '<border/>':
				border = /*::(*/{}/*:: :any)*/;
				if(y.diagonalUp) border.diagonalUp = parsexmlbool(y.diagonalUp);
				if(y.diagonalDown) border.diagonalDown = parsexmlbool(y.diagonalDown);
				styles.Borders.push(border);
				break;
			case '</border>': break;

			/* note: not in spec, appears to be CT_BorderPr */
			case '<left/>': break;
			case '<left': case '<left>': break;
			case '</left>': break;

			/* note: not in spec, appears to be CT_BorderPr */
			case '<right/>': break;
			case '<right': case '<right>': break;
			case '</right>': break;

			/* 18.8.43 top CT_BorderPr */
			case '<top/>': break;
			case '<top': case '<top>': break;
			case '</top>': break;

			/* 18.8.6 bottom CT_BorderPr */
			case '<bottom/>': break;
			case '<bottom': case '<bottom>': break;
			case '</bottom>': break;

			/* 18.8.13 diagonal CT_BorderPr */
			case '<diagonal': case '<diagonal>': case '<diagonal/>': break;
			case '</diagonal>': break;

			/* 18.8.25 horizontal CT_BorderPr */
			case '<horizontal': case '<horizontal>': case '<horizontal/>': break;
			case '</horizontal>': break;

			/* 18.8.44 vertical CT_BorderPr */
			case '<vertical': case '<vertical>': case '<vertical/>': break;
			case '</vertical>': break;

			/* 18.8.37 start CT_BorderPr */
			case '<start': case '<start>': case '<start/>': break;
			case '</start>': break;

			/* 18.8.16 end CT_BorderPr */
			case '<end': case '<end>': case '<end/>': break;
			case '</end>': break;

			/* 18.8.? color CT_Color */
			case '<color': case '<color>':
				break;
			case '<color/>': case '</color>': break;

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': break;
			case '<ext': pass = true; break;
			case '</ext>': pass = false; break;
			default: if(opts && opts.WTF) {
				if(!pass) throw new Error('unrecognized ' + y[0] + ' in borders');
			}
		}
	});
}

/* 18.8.21 fills CT_Fills */
function parse_fills(t, styles, themes, opts) {
	styles.Fills = [];
	var fill = {};
	var pass = false;
	(t.match(tagregex)||[]).forEach(function(x) {
		var y = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<fills': case '<fills>': case '</fills>': break;

			/* 18.8.20 fill CT_Fill */
			case '<fill>': case '<fill': case '<fill/>':
				fill = {}; styles.Fills.push(fill); break;
			case '</fill>': break;

			/* 18.8.24 gradientFill CT_GradientFill */
			case '<gradientFill>': break;
			case '<gradientFill':
			case '</gradientFill>': styles.Fills.push(fill); fill = {}; break;

			/* 18.8.32 patternFill CT_PatternFill */
			case '<patternFill': case '<patternFill>':
				if(y.patternType) fill.patternType = y.patternType;
				break;
			case '<patternFill/>': case '</patternFill>': break;

			/* 18.8.3 bgColor CT_Color */
			case '<bgColor':
				if(!fill.bgColor) fill.bgColor = {};
				if(y.indexed) fill.bgColor.indexed = parseInt(y.indexed, 10);
				if(y.theme) fill.bgColor.theme = parseInt(y.theme, 10);
				if(y.tint) fill.bgColor.tint = parseFloat(y.tint);
				/* Excel uses ARGB strings */
				if(y.rgb) fill.bgColor.rgb = y.rgb.slice(-6);
				break;
			case '<bgColor/>': case '</bgColor>': break;

			/* 18.8.19 fgColor CT_Color */
			case '<fgColor':
				if(!fill.fgColor) fill.fgColor = {};
				if(y.theme) fill.fgColor.theme = parseInt(y.theme, 10);
				if(y.tint) fill.fgColor.tint = parseFloat(y.tint);
				/* Excel uses ARGB strings */
				if(y.rgb != null) fill.fgColor.rgb = y.rgb.slice(-6);
				break;
			case '<fgColor/>': case '</fgColor>': break;

			/* 18.8.38 stop CT_GradientStop */
			case '<stop': case '<stop/>': break;
			case '</stop>': break;

			/* 18.8.? color CT_Color */
			case '<color': case '<color/>': break;
			case '</color>': break;

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': break;
			case '<ext': pass = true; break;
			case '</ext>': pass = false; break;
			default: if(opts && opts.WTF) {
				if(!pass) throw new Error('unrecognized ' + y[0] + ' in fills');
			}
		}
	});
}

/* 18.8.23 fonts CT_Fonts */
function parse_fonts(t, styles, themes, opts) {
	styles.Fonts = [];
	var font = {};
	var pass = false;
	(t.match(tagregex)||[]).forEach(function(x) {
		var y = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<fonts': case '<fonts>': case '</fonts>': break;

			/* 18.8.22 font CT_Font */
			case '<font': case '<font>': break;
			case '</font>': case '<font/>':
				styles.Fonts.push(font);
				font = {};
				break;

			/* 18.8.29 name CT_FontName */
			case '<name': if(y.val) font.name = utf8read(y.val); break;
			case '<name/>': case '</name>': break;

			/* 18.8.2  b CT_BooleanProperty */
			case '<b': font.bold = y.val ? parsexmlbool(y.val) : 1; break;
			case '<b/>': font.bold = 1; break;

			/* 18.8.26 i CT_BooleanProperty */
			case '<i': font.italic = y.val ? parsexmlbool(y.val) : 1; break;
			case '<i/>': font.italic = 1; break;

			/* 18.4.13 u CT_UnderlineProperty */
			case '<u':
				switch(y.val) {
					case "none": font.underline = 0x00; break;
					case "single": font.underline = 0x01; break;
					case "double": font.underline = 0x02; break;
					case "singleAccounting": font.underline = 0x21; break;
					case "doubleAccounting": font.underline = 0x22; break;
				} break;
			case '<u/>': font.underline = 1; break;

			/* 18.4.10 strike CT_BooleanProperty */
			case '<strike': font.strike = y.val ? parsexmlbool(y.val) : 1; break;
			case '<strike/>': font.strike = 1; break;

			/* 18.4.2  outline CT_BooleanProperty */
			case '<outline': font.outline = y.val ? parsexmlbool(y.val) : 1; break;
			case '<outline/>': font.outline = 1; break;

			/* 18.8.36 shadow CT_BooleanProperty */
			case '<shadow': font.shadow = y.val ? parsexmlbool(y.val) : 1; break;
			case '<shadow/>': font.shadow = 1; break;

			/* 18.8.12 condense CT_BooleanProperty */
			case '<condense': font.condense = y.val ? parsexmlbool(y.val) : 1; break;
			case '<condense/>': font.condense = 1; break;

			/* 18.8.17 extend CT_BooleanProperty */
			case '<extend': font.extend = y.val ? parsexmlbool(y.val) : 1; break;
			case '<extend/>': font.extend = 1; break;

			/* 18.4.11 sz CT_FontSize */
			case '<sz': if(y.val) font.sz = +y.val; break;
			case '<sz/>': case '</sz>': break;

			/* 18.4.14 vertAlign CT_VerticalAlignFontProperty */
			case '<vertAlign': if(y.val) font.vertAlign = y.val; break;
			case '<vertAlign/>': case '</vertAlign>': break;

			/* 18.8.18 family CT_FontFamily */
			case '<family': if(y.val) font.family = parseInt(y.val,10); break;
			case '<family/>': case '</family>': break;

			/* 18.8.35 scheme CT_FontScheme */
			case '<scheme': if(y.val) font.scheme = y.val; break;
			case '<scheme/>': case '</scheme>': break;

			/* 18.4.1 charset CT_IntProperty */
			case '<charset':
				if(y.val == '1') break;
				y.codepage = CS2CP[parseInt(y.val, 10)];
				break;

			/* 18.?.? color CT_Color */
			case '<color':
				if(!font.color) font.color = {};
				if(y.auto) font.color.auto = parsexmlbool(y.auto);

				if(y.rgb) font.color.rgb = y.rgb.slice(-6);
				else if(y.indexed) {
					font.color.index = parseInt(y.indexed, 10);
					var icv = XLSIcv[font.color.index];
					if(font.color.index == 81) icv = XLSIcv[1];
					if(!icv) icv = XLSIcv[1]; //throw new Error(x); // note: 206 is valid
					font.color.rgb = icv[0].toString(16) + icv[1].toString(16) + icv[2].toString(16);
				} else if(y.theme) {
					font.color.theme = parseInt(y.theme, 10);
					if(y.tint) font.color.tint = parseFloat(y.tint);
					if(y.theme && themes.themeElements && themes.themeElements.clrScheme) {
						font.color.rgb = rgb_tint(themes.themeElements.clrScheme[font.color.theme].rgb, font.color.tint || 0);
					}
				}

				break;
			case '<color/>': case '</color>': break;

			/* note: sometimes mc:AlternateContent appears bare */
			case '<AlternateContent': pass = true; break;
			case '</AlternateContent>': pass = false; break;

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': break;
			case '<ext': pass = true; break;
			case '</ext>': pass = false; break;
			default: if(opts && opts.WTF) {
				if(!pass) throw new Error('unrecognized ' + y[0] + ' in fonts');
			}
		}
	});
}

/* 18.8.31 numFmts CT_NumFmts */
function parse_numFmts(t, styles, opts) {
	styles.NumberFmt = [];
	var k/*Array<number>*/ = (keys(table_fmt)/*:any*/);
	for(var i=0; i < k.length; ++i) styles.NumberFmt[k[i]] = table_fmt[k[i]];
	var m = t.match(tagregex);
	if(!m) return;
	for(i=0; i < m.length; ++i) {
		var y = parsexmltag(m[i]);
		switch(strip_ns(y[0])) {
			case '<numFmts': case '</numFmts>': case '<numFmts/>': case '<numFmts>': break;
			case '<numFmt': {
				var f=unescapexml(utf8read(y.formatCode)), j=parseInt(y.numFmtId,10);
				styles.NumberFmt[j] = f;
				if(j>0) {
					if(j > 0x188) {
						for(j = 0x188; j > 0x3c; --j) if(styles.NumberFmt[j] == null) break;
						styles.NumberFmt[j] = f;
					}
					SSF__load(f,j);
				}
			} break;
			case '</numFmt>': break;
			default: if(opts.WTF) throw new Error('unrecognized ' + y[0] + ' in numFmts');
		}
	}
}

function write_numFmts(NF/*:{[n:number|string]:string}*//*::, opts*/) {
	var o = ["<numFmts>"];
	[[5,8],[23,26],[41,44],[/*63*/50,/*66],[164,*/392]].forEach(function(r) {
		for(var i = r[0]; i <= r[1]; ++i) if(NF[i] != null) o[o.length] = (writextag('numFmt',null,{numFmtId:i,formatCode:escapexml(NF[i])}));
	});
	if(o.length === 1) return "";
	o[o.length] = ("</numFmts>");
	o[0] = writextag('numFmts', null, { count:o.length-2 }).replace("/>", ">");
	return o.join("");
}

/* 18.8.10 cellXfs CT_CellXfs */
var cellXF_uint = [ "numFmtId", "fillId", "fontId", "borderId", "xfId" ];
var cellXF_bool = [ "applyAlignment", "applyBorder", "applyFill", "applyFont", "applyNumberFormat", "applyProtection", "pivotButton", "quotePrefix" ];
function parse_cellXfs(t, styles, opts) {
	styles.CellXf = [];
	var xf;
	var pass = false;
	(t.match(tagregex)||[]).forEach(function(x) {
		var y = parsexmltag(x), i = 0;
		switch(strip_ns(y[0])) {
			case '<cellXfs': case '<cellXfs>': case '<cellXfs/>': case '</cellXfs>': break;

			/* 18.8.45 xf CT_Xf */
			case '<xf': case '<xf/>': case '<xf>':
				xf = y;
				delete xf[0];
				for(i = 0; i < cellXF_uint.length; ++i) if(xf[cellXF_uint[i]])
					xf[cellXF_uint[i]] = parseInt(xf[cellXF_uint[i]], 10);
				for(i = 0; i < cellXF_bool.length; ++i) if(xf[cellXF_bool[i]])
					xf[cellXF_bool[i]] = parsexmlbool(xf[cellXF_bool[i]]);
				if(styles.NumberFmt && xf.numFmtId > 0x188) {
					for(i = 0x188; i > 0x3c; --i) if(styles.NumberFmt[xf.numFmtId] == styles.NumberFmt[i]) { xf.numFmtId = i; break; }
				}
				styles.CellXf.push(xf); break;
			case '</xf>': break;

			/* 18.8.1 alignment CT_CellAlignment */
			case '<alignment': case '<alignment/>': case '<alignment>':
				var alignment = {};
				if(y.vertical) alignment.vertical = y.vertical;
				if(y.horizontal) alignment.horizontal = y.horizontal;
				if(y.textRotation != null) alignment.textRotation = y.textRotation;
				if(y.indent) alignment.indent = y.indent;
				if(y.wrapText) alignment.wrapText = parsexmlbool(y.wrapText);
				xf.alignment = alignment;
				break;
			case '</alignment>': break;

			/* 18.8.33 protection CT_CellProtection */
			case '<protection': case '<protection>':
				break;
			case '</protection>': case '<protection/>': break;

			/* note: sometimes mc:AlternateContent appears bare */
			case '<AlternateContent': case '<AlternateContent>': pass = true; break;
			case '</AlternateContent>': pass = false; break;

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': break;
			case '<ext': pass = true; break;
			case '</ext>': pass = false; break;
			default: if(opts && opts.WTF) {
				if(!pass) throw new Error('unrecognized ' + y[0] + ' in cellXfs');
			}
		}
	});
}

function write_cellXfs(cellXfs)/*:string*/ {
	var o/*:Array<string>*/ = [];
	o[o.length] = (writextag('cellXfs',null));
	cellXfs.forEach(function(c) {
		o[o.length] = (writextag('xf', null, c));
	});
	o[o.length] = ("</cellXfs>");
	if(o.length === 2) return "";
	o[0] = writextag('cellXfs',null, {count:o.length-2}).replace("/>",">");
	return o.join("");
}

/* 18.8 Styles CT_Stylesheet*/
var parse_sty_xml= /*#__PURE__*/(function make_pstyx() {

return function parse_sty_xml(data, themes, opts) {
	var styles = {};
	if(!data) return styles;
	data = remove_doctype(str_remove_ng(data, "<!--", "-->"));
	/* 18.8.39 styleSheet CT_Stylesheet */
	var t;

	/* 18.8.31 numFmts CT_NumFmts ? */
	if((t=str_match_xml_ns(data, "numFmts"))) parse_numFmts(t[0], styles, opts);

	/* 18.8.23 fonts CT_Fonts ? */
	if((t=str_match_xml_ns(data, "fonts"))) parse_fonts(t[0], styles, themes, opts);

	/* 18.8.21 fills CT_Fills ? */
	if((t=str_match_xml_ns(data, "fills"))) parse_fills(t[0], styles, themes, opts);

	/* 18.8.5  borders CT_Borders ? */
	if((t=str_match_xml_ns(data, "borders"))) parse_borders(t[0], styles, themes, opts);

	/* 18.8.9  cellStyleXfs CT_CellStyleXfs ? */
	/* 18.8.8  cellStyles CT_CellStyles ? */

	/* 18.8.10 cellXfs CT_CellXfs ? */
	if((t=str_match_xml_ns(data, "cellXfs"))) parse_cellXfs(t[0], styles, opts);

	/* 18.8.15 dxfs CT_Dxfs ? */
	/* 18.8.42 tableStyles CT_TableStyles ? */
	/* 18.8.11 colors CT_Colors ? */
	/* 18.2.10 extLst CT_ExtensionList ? */

	return styles;
};
})();

function write_sty_xml(wb/*:Workbook*/, opts)/*:string*/ {
	var o = [XML_HEADER, writextag('styleSheet', null, {
		'xmlns': XMLNS_main[0],
		'xmlns:vt': XMLNS.vt
	})], w;
	if(wb.SSF && (w = write_numFmts(wb.SSF)) != null) o[o.length] = w;
	o[o.length] = ('<fonts count="1"><font><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>');
	o[o.length] = ('<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>');
	o[o.length] = ('<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>');
	o[o.length] = ('<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>');
	if((w = write_cellXfs(opts.cellXfs))) o[o.length] = (w);
	o[o.length] = ('<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>');
	o[o.length] = ('<dxfs count="0"/>');
	o[o.length] = ('<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/>');

	if(o.length>2){ o[o.length] = ('</styleSheet>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
/* Even though theme layout is dk1 lt1 dk2 lt2, true order is lt1 dk1 lt2 dk2 */
var XLSXThemeClrScheme = [
	'</a:lt1>', '</a:dk1>', '</a:lt2>', '</a:dk2>',
	'</a:accent1>', '</a:accent2>', '</a:accent3>',
	'</a:accent4>', '</a:accent5>', '</a:accent6>',
	'</a:hlink>', '</a:folHlink>'
];
/* 20.1.6.2 clrScheme CT_ColorScheme */
function parse_clrScheme(t, themes, opts) {
	themes.themeElements.clrScheme = [];
	var color = {};
	(t[0].match(tagregex)||[]).forEach(function(x) {
		var y = parsexmltag(x);
		switch(y[0]) {
			/* 20.1.6.2 clrScheme (Color Scheme) CT_ColorScheme */
			case '<a:clrScheme': case '</a:clrScheme>': break;

			/* 20.1.2.3.32 srgbClr CT_SRgbColor */
			case '<a:srgbClr':
				color.rgb = y.val; break;
			case '</a:srgbClr>': break;

			/* 20.1.2.3.33 sysClr CT_SystemColor */
			case '<a:sysClr':
				color.rgb = y.lastClr; break;
			case '</a:sysClr>': break;

			/* 20.1.4.1.1 accent1 (Accent 1) */
			/* 20.1.4.1.2 accent2 (Accent 2) */
			/* 20.1.4.1.3 accent3 (Accent 3) */
			/* 20.1.4.1.4 accent4 (Accent 4) */
			/* 20.1.4.1.5 accent5 (Accent 5) */
			/* 20.1.4.1.6 accent6 (Accent 6) */
			/* 20.1.4.1.9 dk1 (Dark 1) */
			/* 20.1.4.1.10 dk2 (Dark 2) */
			/* 20.1.4.1.15 folHlink (Followed Hyperlink) */
			/* 20.1.4.1.19 hlink (Hyperlink) */
			/* 20.1.4.1.22 lt1 (Light 1) */
			/* 20.1.4.1.23 lt2 (Light 2) */
			case '</a:dk1>':
			case '</a:lt1>':
			case '<a:dk1>':
			case '<a:lt1>':
			case '<a:dk2>': case '</a:dk2>':
			case '<a:lt2>': case '</a:lt2>':
			case '<a:accent1>': case '</a:accent1>':
			case '<a:accent2>': case '</a:accent2>':
			case '<a:accent3>': case '</a:accent3>':
			case '<a:accent4>': case '</a:accent4>':
			case '<a:accent5>': case '</a:accent5>':
			case '<a:accent6>': case '</a:accent6>':
			case '<a:hlink>': case '</a:hlink>':
			case '<a:folHlink>': case '</a:folHlink>':
				if (y[0].charAt(1) === '/') {
					themes.themeElements.clrScheme[XLSXThemeClrScheme.indexOf(y[0])] = color;
					color = {};
				} else {
					color.name = y[0].slice(3, y[0].length - 1);
				}
				break;

			default: if(opts && opts.WTF) throw new Error('Unrecognized ' + y[0] + ' in clrScheme');
		}
	});
}

/* 20.1.4.1.18 fontScheme CT_FontScheme */
function parse_fontScheme(/*::t, themes, opts*/) { }

/* 20.1.4.1.15 fmtScheme CT_StyleMatrix */
function parse_fmtScheme(/*::t, themes, opts*/) { }

/* 20.1.6.10 themeElements CT_BaseStyles */
function parse_themeElements(data, themes, opts) {
	themes.themeElements = {};

	var t;

	/* clrScheme CT_ColorScheme */
	if(!(t=str_match_xml(data, "a:clrScheme"))) throw new Error('clrScheme not found in themeElements');
	parse_clrScheme(t, themes, opts);

	/* fontScheme CT_FontScheme */
	if(!(t=str_match_xml(data, "a:fontScheme"))) throw new Error('fontScheme not found in themeElements');
	parse_fontScheme(t, themes, opts);

	/* fmtScheme CT_StyleMatrix */
	if(!(t=str_match_xml(data, "a:fmtScheme"))) throw new Error('fmtScheme not found in themeElements');
	parse_fmtScheme(t, themes, opts);
}

/* 14.2.7 Theme Part */
function parse_theme_xml(data/*:string*/, opts) {
	/* 20.1.6.9 theme CT_OfficeStyleSheet */
	if(!data || data.length === 0) data = write_theme();

	var t;
	var themes = {};

	/* themeElements CT_BaseStyles */
	if(!(t=str_match_xml(data, "a:themeElements"))) throw new Error('themeElements not found in theme');
	parse_themeElements(t[0], themes, opts);
	themes.raw = data;
	return themes;
}

function write_theme(Themes, opts)/*:string*/ {
	if(opts && opts.themeXLSX) return opts.themeXLSX;
	if(Themes && typeof Themes.raw == "string") return Themes.raw;
	var o = [XML_HEADER];
	o[o.length] = '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">';
	o[o.length] =  '<a:themeElements>';

	o[o.length] =   '<a:clrScheme name="Office">';
	o[o.length] =    '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>';
	o[o.length] =    '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>';
	o[o.length] =    '<a:dk2><a:srgbClr val="1F497D"/></a:dk2>';
	o[o.length] =    '<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>';
	o[o.length] =    '<a:accent1><a:srgbClr val="4F81BD"/></a:accent1>';
	o[o.length] =    '<a:accent2><a:srgbClr val="C0504D"/></a:accent2>';
	o[o.length] =    '<a:accent3><a:srgbClr val="9BBB59"/></a:accent3>';
	o[o.length] =    '<a:accent4><a:srgbClr val="8064A2"/></a:accent4>';
	o[o.length] =    '<a:accent5><a:srgbClr val="4BACC6"/></a:accent5>';
	o[o.length] =    '<a:accent6><a:srgbClr val="F79646"/></a:accent6>';
	o[o.length] =    '<a:hlink><a:srgbClr val="0000FF"/></a:hlink>';
	o[o.length] =    '<a:folHlink><a:srgbClr val="800080"/></a:folHlink>';
	o[o.length] =   '</a:clrScheme>';

	o[o.length] =   '<a:fontScheme name="Office">';
	o[o.length] =    '<a:majorFont>';
	o[o.length] =     '<a:latin typeface="Cambria"/>';
	o[o.length] =     '<a:ea typeface=""/>';
	o[o.length] =     '<a:cs typeface=""/>';
	o[o.length] =     '<a:font script="Jpan" typeface="ＭＳ Ｐゴシック"/>';
	o[o.length] =     '<a:font script="Hang" typeface="맑은 고딕"/>';
	o[o.length] =     '<a:font script="Hans" typeface="宋体"/>';
	o[o.length] =     '<a:font script="Hant" typeface="新細明體"/>';
	o[o.length] =     '<a:font script="Arab" typeface="Times New Roman"/>';
	o[o.length] =     '<a:font script="Hebr" typeface="Times New Roman"/>';
	o[o.length] =     '<a:font script="Thai" typeface="Tahoma"/>';
	o[o.length] =     '<a:font script="Ethi" typeface="Nyala"/>';
	o[o.length] =     '<a:font script="Beng" typeface="Vrinda"/>';
	o[o.length] =     '<a:font script="Gujr" typeface="Shruti"/>';
	o[o.length] =     '<a:font script="Khmr" typeface="MoolBoran"/>';
	o[o.length] =     '<a:font script="Knda" typeface="Tunga"/>';
	o[o.length] =     '<a:font script="Guru" typeface="Raavi"/>';
	o[o.length] =     '<a:font script="Cans" typeface="Euphemia"/>';
	o[o.length] =     '<a:font script="Cher" typeface="Plantagenet Cherokee"/>';
	o[o.length] =     '<a:font script="Yiii" typeface="Microsoft Yi Baiti"/>';
	o[o.length] =     '<a:font script="Tibt" typeface="Microsoft Himalaya"/>';
	o[o.length] =     '<a:font script="Thaa" typeface="MV Boli"/>';
	o[o.length] =     '<a:font script="Deva" typeface="Mangal"/>';
	o[o.length] =     '<a:font script="Telu" typeface="Gautami"/>';
	o[o.length] =     '<a:font script="Taml" typeface="Latha"/>';
	o[o.length] =     '<a:font script="Syrc" typeface="Estrangelo Edessa"/>';
	o[o.length] =     '<a:font script="Orya" typeface="Kalinga"/>';
	o[o.length] =     '<a:font script="Mlym" typeface="Kartika"/>';
	o[o.length] =     '<a:font script="Laoo" typeface="DokChampa"/>';
	o[o.length] =     '<a:font script="Sinh" typeface="Iskoola Pota"/>';
	o[o.length] =     '<a:font script="Mong" typeface="Mongolian Baiti"/>';
	o[o.length] =     '<a:font script="Viet" typeface="Times New Roman"/>';
	o[o.length] =     '<a:font script="Uigh" typeface="Microsoft Uighur"/>';
	o[o.length] =     '<a:font script="Geor" typeface="Sylfaen"/>';
	o[o.length] =    '</a:majorFont>';
	o[o.length] =    '<a:minorFont>';
	o[o.length] =     '<a:latin typeface="Calibri"/>';
	o[o.length] =     '<a:ea typeface=""/>';
	o[o.length] =     '<a:cs typeface=""/>';
	o[o.length] =     '<a:font script="Jpan" typeface="ＭＳ Ｐゴシック"/>';
	o[o.length] =     '<a:font script="Hang" typeface="맑은 고딕"/>';
	o[o.length] =     '<a:font script="Hans" typeface="宋体"/>';
	o[o.length] =     '<a:font script="Hant" typeface="新細明體"/>';
	o[o.length] =     '<a:font script="Arab" typeface="Arial"/>';
	o[o.length] =     '<a:font script="Hebr" typeface="Arial"/>';
	o[o.length] =     '<a:font script="Thai" typeface="Tahoma"/>';
	o[o.length] =     '<a:font script="Ethi" typeface="Nyala"/>';
	o[o.length] =     '<a:font script="Beng" typeface="Vrinda"/>';
	o[o.length] =     '<a:font script="Gujr" typeface="Shruti"/>';
	o[o.length] =     '<a:font script="Khmr" typeface="DaunPenh"/>';
	o[o.length] =     '<a:font script="Knda" typeface="Tunga"/>';
	o[o.length] =     '<a:font script="Guru" typeface="Raavi"/>';
	o[o.length] =     '<a:font script="Cans" typeface="Euphemia"/>';
	o[o.length] =     '<a:font script="Cher" typeface="Plantagenet Cherokee"/>';
	o[o.length] =     '<a:font script="Yiii" typeface="Microsoft Yi Baiti"/>';
	o[o.length] =     '<a:font script="Tibt" typeface="Microsoft Himalaya"/>';
	o[o.length] =     '<a:font script="Thaa" typeface="MV Boli"/>';
	o[o.length] =     '<a:font script="Deva" typeface="Mangal"/>';
	o[o.length] =     '<a:font script="Telu" typeface="Gautami"/>';
	o[o.length] =     '<a:font script="Taml" typeface="Latha"/>';
	o[o.length] =     '<a:font script="Syrc" typeface="Estrangelo Edessa"/>';
	o[o.length] =     '<a:font script="Orya" typeface="Kalinga"/>';
	o[o.length] =     '<a:font script="Mlym" typeface="Kartika"/>';
	o[o.length] =     '<a:font script="Laoo" typeface="DokChampa"/>';
	o[o.length] =     '<a:font script="Sinh" typeface="Iskoola Pota"/>';
	o[o.length] =     '<a:font script="Mong" typeface="Mongolian Baiti"/>';
	o[o.length] =     '<a:font script="Viet" typeface="Arial"/>';
	o[o.length] =     '<a:font script="Uigh" typeface="Microsoft Uighur"/>';
	o[o.length] =     '<a:font script="Geor" typeface="Sylfaen"/>';
	o[o.length] =    '</a:minorFont>';
	o[o.length] =   '</a:fontScheme>';

	o[o.length] =   '<a:fmtScheme name="Office">';
	o[o.length] =    '<a:fillStyleLst>';
	o[o.length] =     '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
	o[o.length] =     '<a:gradFill rotWithShape="1">';
	o[o.length] =      '<a:gsLst>';
	o[o.length] =       '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs>';
	o[o.length] =       '<a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs>';
	o[o.length] =       '<a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs>';
	o[o.length] =      '</a:gsLst>';
	o[o.length] =      '<a:lin ang="16200000" scaled="1"/>';
	o[o.length] =     '</a:gradFill>';
	o[o.length] =     '<a:gradFill rotWithShape="1">';
	o[o.length] =      '<a:gsLst>';
	o[o.length] =       '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="100000"/><a:shade val="100000"/><a:satMod val="130000"/></a:schemeClr></a:gs>';
	o[o.length] =       '<a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="50000"/><a:shade val="100000"/><a:satMod val="350000"/></a:schemeClr></a:gs>';
	o[o.length] =      '</a:gsLst>';
	o[o.length] =      '<a:lin ang="16200000" scaled="0"/>';
	o[o.length] =     '</a:gradFill>';
	o[o.length] =    '</a:fillStyleLst>';
	o[o.length] =    '<a:lnStyleLst>';
	o[o.length] =     '<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill><a:prstDash val="solid"/></a:ln>';
	o[o.length] =     '<a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>';
	o[o.length] =     '<a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>';
	o[o.length] =    '</a:lnStyleLst>';
	o[o.length] =    '<a:effectStyleLst>';
	o[o.length] =     '<a:effectStyle>';
	o[o.length] =      '<a:effectLst>';
	o[o.length] =       '<a:outerShdw blurRad="40000" dist="20000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="38000"/></a:srgbClr></a:outerShdw>';
	o[o.length] =      '</a:effectLst>';
	o[o.length] =     '</a:effectStyle>';
	o[o.length] =     '<a:effectStyle>';
	o[o.length] =      '<a:effectLst>';
	o[o.length] =       '<a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw>';
	o[o.length] =      '</a:effectLst>';
	o[o.length] =     '</a:effectStyle>';
	o[o.length] =     '<a:effectStyle>';
	o[o.length] =      '<a:effectLst>';
	o[o.length] =       '<a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr></a:outerShdw>';
	o[o.length] =      '</a:effectLst>';
	o[o.length] =      '<a:scene3d><a:camera prst="orthographicFront"><a:rot lat="0" lon="0" rev="0"/></a:camera><a:lightRig rig="threePt" dir="t"><a:rot lat="0" lon="0" rev="1200000"/></a:lightRig></a:scene3d>';
	o[o.length] =      '<a:sp3d><a:bevelT w="63500" h="25400"/></a:sp3d>';
	o[o.length] =     '</a:effectStyle>';
	o[o.length] =    '</a:effectStyleLst>';
	o[o.length] =    '<a:bgFillStyleLst>';
	o[o.length] =     '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
	o[o.length] =     '<a:gradFill rotWithShape="1">';
	o[o.length] =      '<a:gsLst>';
	o[o.length] =       '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="40000"/><a:satMod val="350000"/></a:schemeClr></a:gs>';
	o[o.length] =       '<a:gs pos="40000"><a:schemeClr val="phClr"><a:tint val="45000"/><a:shade val="99000"/><a:satMod val="350000"/></a:schemeClr></a:gs>';
	o[o.length] =       '<a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="20000"/><a:satMod val="255000"/></a:schemeClr></a:gs>';
	o[o.length] =      '</a:gsLst>';
	o[o.length] =      '<a:path path="circle"><a:fillToRect l="50000" t="-80000" r="50000" b="180000"/></a:path>';
	o[o.length] =     '</a:gradFill>';
	o[o.length] =     '<a:gradFill rotWithShape="1">';
	o[o.length] =      '<a:gsLst>';
	o[o.length] =       '<a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="80000"/><a:satMod val="300000"/></a:schemeClr></a:gs>';
	o[o.length] =       '<a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="30000"/><a:satMod val="200000"/></a:schemeClr></a:gs>';
	o[o.length] =      '</a:gsLst>';
	o[o.length] =      '<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>';
	o[o.length] =     '</a:gradFill>';
	o[o.length] =    '</a:bgFillStyleLst>';
	o[o.length] =   '</a:fmtScheme>';
	o[o.length] =  '</a:themeElements>';

	o[o.length] =  '<a:objectDefaults>';
	o[o.length] =   '<a:spDef>';
	o[o.length] =    '<a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="3"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></a:style>';
	o[o.length] =   '</a:spDef>';
	o[o.length] =   '<a:lnDef>';
	o[o.length] =    '<a:spPr/><a:bodyPr/><a:lstStyle/><a:style><a:lnRef idx="2"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="1"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef></a:style>';
	o[o.length] =   '</a:lnDef>';
	o[o.length] =  '</a:objectDefaults>';
	o[o.length] =  '<a:extraClrSchemeLst/>';
	o[o.length] = '</a:theme>';
	return o.join("");
}
function parse_xlmeta_xml(data, name, opts) {
  var out = { Types: [], Cell: [], Value: [] };
  if (!data)
    return out;
  var pass = false;
  var metatype = 2;
  var lastmeta;
  data.replace(tagregex, function(x) {
    var y = parsexmltag(x);
    switch (strip_ns(y[0])) {
      case "<?xml":
        break;
      case "<metadata":
      case "</metadata>":
        break;
      case "<metadataTypes":
      case "</metadataTypes>":
        break;
      case "<metadataType":
        out.Types.push({ name: y.name });
        break;
      case "</metadataType>":
        break;
      case "<futureMetadata":
        for (var j = 0; j < out.Types.length; ++j)
          if (out.Types[j].name == y.name)
            lastmeta = out.Types[j];
        break;
      case "</futureMetadata>":
        break;
      case "<bk>":
        break;
      case "</bk>":
        break;
      case "<rc":
        if (metatype == 1)
          out.Cell.push({ type: out.Types[y.t - 1].name, index: +y.v });
        else if (metatype == 0)
          out.Value.push({ type: out.Types[y.t - 1].name, index: +y.v });
        break;
      case "</rc>":
        break;
      case "<cellMetadata":
        metatype = 1;
        break;
      case "</cellMetadata>":
        metatype = 2;
        break;
      case "<valueMetadata":
        metatype = 0;
        break;
      case "</valueMetadata>":
        metatype = 2;
        break;
      case "<extLst":
      case "<extLst>":
      case "</extLst>":
      case "<extLst/>":
        break;
      case "<ext":
        pass = true;
        break;
      case "</ext>":
        pass = false;
        break;
      case "<rvb":
        if (!lastmeta)
          break;
        if (!lastmeta.offsets)
          lastmeta.offsets = [];
        lastmeta.offsets.push(+y.i);
        break;
      default:
        if (!pass && (opts == null ? void 0 : opts.WTF))
          throw new Error("unrecognized " + y[0] + " in metadata");
    }
    return x;
  });
  return out;
}
function write_xlmeta_xml() {
  var o = [XML_HEADER];
  o.push('<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xlrd="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray">\n  <metadataTypes count="1">\n    <metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/>\n  </metadataTypes>\n  <futureMetadata name="XLDAPR" count="1">\n    <bk>\n      <extLst>\n        <ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}">\n          <xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/>\n        </ext>\n      </extLst>\n    </bk>\n  </futureMetadata>\n  <cellMetadata count="1">\n    <bk>\n      <rc t="1" v="0"/>\n    </bk>\n  </cellMetadata>\n</metadata>');
  return o.join("");
}
/* 18.14 Supplementary Workbook Data */
function parse_xlink_xml(/*::data, rel, name:string, _opts*/) {
	//var opts = _opts || {};
	//if(opts.WTF) throw "XLSX External Link";
}

/* [MS-XLSB] 2.1.7.25 External Link */
function parse_xlink_bin(data, rel, name/*:string*/, _opts) {
	if(!data) return data;
	var opts = _opts || {};

	var pass = false, end = false;

	recordhopper(data, function xlink_parse(val, R, RT) {
		if(end) return;
		switch(RT) {
			case 0x0167: /* 'BrtSupTabs' */
			case 0x016B: /* 'BrtExternTableStart' */
			case 0x016C: /* 'BrtExternTableEnd' */
			case 0x016E: /* 'BrtExternRowHdr' */
			case 0x016F: /* 'BrtExternCellBlank' */
			case 0x0170: /* 'BrtExternCellReal' */
			case 0x0171: /* 'BrtExternCellBool' */
			case 0x0172: /* 'BrtExternCellError' */
			case 0x0173: /* 'BrtExternCellString' */
			case 0x01D8: /* 'BrtExternValueMeta' */
			case 0x0241: /* 'BrtSupNameStart' */
			case 0x0242: /* 'BrtSupNameValueStart' */
			case 0x0243: /* 'BrtSupNameValueEnd' */
			case 0x0244: /* 'BrtSupNameNum' */
			case 0x0245: /* 'BrtSupNameErr' */
			case 0x0246: /* 'BrtSupNameSt' */
			case 0x0247: /* 'BrtSupNameNil' */
			case 0x0248: /* 'BrtSupNameBool' */
			case 0x0249: /* 'BrtSupNameFmla' */
			case 0x024A: /* 'BrtSupNameBits' */
			case 0x024B: /* 'BrtSupNameEnd' */
				break;

			case 0x0023: /* 'BrtFRTBegin' */
				pass = true; break;
			case 0x0024: /* 'BrtFRTEnd' */
				pass = false; break;

			default:
				if(R.T){/* empty */}
				else if(!pass || opts.WTF) throw new Error("Unexpected record 0x" + RT.toString(16));
		}
	}, opts);
}
/* 20.5 DrawingML - SpreadsheetML Drawing */
/* 20.5.2.35 wsDr CT_Drawing */
function parse_drawing(data, rels/*:any*/) {
	if(!data) return "??";
	/*
	  Chartsheet Drawing:
	   - 20.5.2.35 wsDr CT_Drawing
	    - 20.5.2.1  absoluteAnchor CT_AbsoluteAnchor
	     - 20.5.2.16 graphicFrame CT_GraphicalObjectFrame
	      - 20.1.2.2.16 graphic CT_GraphicalObject
	       - 20.1.2.2.17 graphicData CT_GraphicalObjectData
          - chart reference
	   the actual type is based on the URI of the graphicData
		TODO: handle embedded charts and other types of graphics
	*/
	var id = (data.match(/<c:chart [^<>]*r:id="([^<>"]*)"/)||["",""])[1];

	return rels['!id'][id].Target;
}

/* L.5.5.2 SpreadsheetML Comments + VML Schema */
function parse_vml(data/*:string*/, sheet, comments) {
	var cidx = 0;
	(str_match_xml_ns_g(data, "shape")||[]).forEach(function(m) {
		var type = "";
		var hidden = true;
		var aidx = -1;
		var R = -1, C = -1;
		m.replace(tagregex, function(x/*:string*/, idx/*:number*/) {
			var y = parsexmltag(x);
			switch(strip_ns(y[0])) {
				case '<ClientData': if(y.ObjectType) type = y.ObjectType; break;

				case '<Visible': case '<Visible/>': hidden = false; break;

				case '<Row': case '<Row>': aidx = idx + x.length; break;
				case '</Row>': R = +m.slice(aidx, idx).trim(); break;

				case '<Column': case '<Column>': aidx = idx + x.length; break;
				case '</Column>': C = +m.slice(aidx, idx).trim(); break;
			}
			return "";
		});
		switch(type) {
		case 'Note':
			var cell = ws_get_cell_stub(sheet, ((R>=0 && C>=0) ? encode_cell({r:R,c:C}) : comments[cidx].ref));
			if(cell.c) {
				cell.c.hidden = hidden;
			}
			++cidx;
			break;
		}

	});
}


/* comment boxes */
function write_vml(rId/*:number*/, comments, ws) {
	var csize = [21600, 21600];
	/* L.5.2.1.2 Path Attribute */
	var bbox = ["m0,0l0",csize[1],csize[0],csize[1],csize[0],"0xe"].join(",");
	var o = [
		writextag("xml", null, { 'xmlns:v': XLMLNS.v, 'xmlns:o': XLMLNS.o, 'xmlns:x': XLMLNS.x, 'xmlns:mv': XLMLNS.mv }).replace(/\/>/,">"),
		writextag("o:shapelayout", writextag("o:idmap", null, {'v:ext':"edit", 'data':rId}), {'v:ext':"edit"})
	];

	var _shapeid = 65536 * rId;

	var _comments = comments || [];
	if(_comments.length > 0) o.push(writextag("v:shapetype", [
		writextag("v:stroke", null, {joinstyle:"miter"}),
		writextag("v:path", null, {gradientshapeok:"t", 'o:connecttype':"rect"})
	].join(""), {id:"_x0000_t202", coordsize:csize.join(","), 'o:spt':202, path:bbox}));

	_comments.forEach(function(x) { ++_shapeid; o.push(write_vml_comment(x, _shapeid)); });
	o.push('</xml>');
	return o.join("");
}

function write_vml_comment(x, _shapeid, ws)/*:string*/ {
	var c = decode_cell(x[0]);
	var fillopts = /*::(*/{'color2':"#BEFF82", 'type':"gradient"}/*:: :any)*/;
	if(fillopts.type == "gradient") fillopts.angle = "-180";
	var fillparm = fillopts.type == "gradient" ? writextag("o:fill", null, {type:"gradientUnscaled", 'v:ext':"view"}) : null;
	var fillxml = writextag('v:fill', fillparm, fillopts);

	var shadata = ({on:"t", 'obscured':"t"}/*:any*/);

	return [
	'<v:shape' + wxt_helper({
		id:'_x0000_s' + _shapeid,
		type:"#_x0000_t202",
		style:"position:absolute; margin-left:80pt;margin-top:5pt;width:104pt;height:64pt;z-index:10" + (x[1].hidden ? ";visibility:hidden" : "") ,
		fillcolor:"#ECFAD4",
		strokecolor:"#edeaa1"
	}) + '>',
		fillxml,
		writextag("v:shadow", null, shadata),
		writextag("v:path", null, {'o:connecttype':"none"}),
		'<v:textbox><div style="text-align:left"></div></v:textbox>',
		'<x:ClientData ObjectType="Note">',
			'<x:MoveWithCells/>',
			'<x:SizeWithCells/>',
			/* Part 4 19.4.2.3 Anchor (Anchor) */
			writetag('x:Anchor', [c.c+1, 0, c.r+1, 0, c.c+3, 20, c.r+5, 20].join(",")),
			writetag('x:AutoFill', "False"),
			writetag('x:Row', String(c.r)),
			writetag('x:Column', String(c.c)),
			x[1].hidden ? '' : '<x:Visible/>',
		'</x:ClientData>',
	'</v:shape>'
	].join("");
}
function sheet_insert_comments(sheet/*:WorkSheet*/, comments/*:Array<RawComment>*/, threaded/*:boolean*/, people/*:?Array<any>*/) {
	var dense = sheet["!data"] != null;
	var cell/*:Cell*/;
	comments.forEach(function(comment) {
		var r = decode_cell(comment.ref);
		if(r.r < 0 || r.c < 0) return;
		if(dense) {
			if(!sheet["!data"][r.r]) sheet["!data"][r.r] = [];
			cell = sheet["!data"][r.r][r.c];
		} else cell = sheet[comment.ref];
		if (!cell) {
			cell = ({t:"z"}/*:any*/);
			if(dense) sheet["!data"][r.r][r.c] = cell;
			else sheet[comment.ref] = cell;
			var range = safe_decode_range(sheet["!ref"]||"BDWGO1000001:A1");
			if(range.s.r > r.r) range.s.r = r.r;
			if(range.e.r < r.r) range.e.r = r.r;
			if(range.s.c > r.c) range.s.c = r.c;
			if(range.e.c < r.c) range.e.c = r.c;
			var encoded = encode_range(range);
			sheet["!ref"] = encoded;
		}

		if (!cell.c) cell.c = [];
		var o/*:Comment*/ = ({a: comment.author, t: comment.t, r: comment.r, T: threaded});
		if(comment.h) o.h = comment.h;

		/* threaded comments always override */
		for(var i = cell.c.length - 1; i >= 0; --i) {
			if(!threaded && cell.c[i].T) return;
			if(threaded && !cell.c[i].T) cell.c.splice(i, 1);
		}
		if(threaded && people) for(i = 0; i < people.length; ++i) {
			if(o.a == people[i].id) { o.a = people[i].name || o.a; break; }
		}
		cell.c.push(o);
	});
}
/* 18.7 Comments */
function parse_comments_xml(data/*:string*/, opts)/*:Array<RawComment>*/ {
	/* 18.7.6 CT_Comments */
	if(data.match(/<(?:\w+:)?comments *\/>/)) return [];
	var authors/*:Array<string>*/ = [];
	var commentList/*:Array<RawComment>*/ = [];
	var authtag = str_match_xml_ns(data, "authors");
	if(authtag && authtag[1]) authtag[1].split(/<\/\w*:?author>/).forEach(function(x) {
		if(x === "" || x.trim() === "") return;
		var a = x.match(/<(?:\w+:)?author[^<>]*>(.*)/);
		if(a) authors.push(a[1]);
	});
	var cmnttag = str_match_xml_ns(data, "commentList");
	if(cmnttag && cmnttag[1]) cmnttag[1].split(/<\/\w*:?comment>/).forEach(function(x) {
		if(x === "" || x.trim() === "") return;
		var cm = x.match(/<(?:\w+:)?comment[^<>]*>/);
		if(!cm) return;
		var y = parsexmltag(cm[0]);
		var comment/*:RawComment*/ = ({ author: y.authorId && authors[y.authorId] || "sheetjsghost", ref: y.ref, guid: y.guid }/*:any*/);
		var cell = decode_cell(y.ref);
		if(opts.sheetRows && opts.sheetRows <= cell.r) return;
		var textMatch = str_match_xml_ns(x, "text");
		var rt = !!textMatch && !!textMatch[1] && parse_si(textMatch[1]) || {r:"",t:"",h:""};
		comment.r = rt.r;
		if(rt.r == "<t></t>") rt.t = rt.h = "";
		comment.t = (rt.t||"").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
		if(opts.cellHTML) comment.h = rt.h;
		commentList.push(comment);
	});
	return commentList;
}

function write_comments_xml(data/*::, opts*/) {
	var o = [XML_HEADER, writextag('comments', null, { 'xmlns': XMLNS_main[0] })];

	var iauthor/*:Array<string>*/ = [];
	o.push("<authors>");
	data.forEach(function(x) { x[1].forEach(function(w) { var a = escapexml(w.a);
		if(iauthor.indexOf(a) == -1) {
			iauthor.push(a);
			o.push("<author>" + a + "</author>");
		}
		if(w.T && w.ID && iauthor.indexOf("tc=" + w.ID) == -1) {
			iauthor.push("tc=" + w.ID);
			o.push("<author>" + "tc=" + w.ID + "</author>");
		}
	}); });
	if(iauthor.length == 0) { iauthor.push("SheetJ5"); o.push("<author>SheetJ5</author>"); }
	o.push("</authors>");
	o.push("<commentList>");
	data.forEach(function(d) {
		/* 18.7.3 CT_Comment */
		var lastauthor = 0, ts = [], tcnt = 0;
		if(d[1][0] && d[1][0].T && d[1][0].ID) lastauthor = iauthor.indexOf("tc=" + d[1][0].ID);
		d[1].forEach(function(c) {
			if(c.a) lastauthor = iauthor.indexOf(escapexml(c.a));
			if(c.T) ++tcnt;
			ts.push(c.t == null ? "" : escapexml(c.t));
		});
		if(tcnt === 0) {
			d[1].forEach(function(c) {
				o.push('<comment ref="' + d[0] + '" authorId="' + iauthor.indexOf(escapexml(c.a)) + '"><text>');
				o.push(writetag("t", c.t == null ? "" : escapexml(c.t)));
				o.push('</text></comment>');
			});
		} else {
			if(d[1][0] && d[1][0].T && d[1][0].ID) lastauthor = iauthor.indexOf("tc=" + d[1][0].ID);
			/* based on Threaded Comments -> Comments projection */
			o.push('<comment ref="' + d[0] + '" authorId="' + lastauthor + '"><text>');
			var t = "Comment:\n    " + (ts[0]) + "\n";
			for(var i = 1; i < ts.length; ++i) t += "Reply:\n    " + ts[i] + "\n";
			o.push(writetag("t", escapexml(t)));
			o.push('</text></comment>');
		}
	});
	o.push("</commentList>");
	if(o.length>2) { o[o.length] = ('</comments>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}

/* [MS-XLSX] 2.1.17 */
function parse_tcmnt_xml(data/*:string*/, opts)/*:Array<RawComment>*/ {
	var out = [];
	var pass = false, comment = {}, tidx = 0;
	data.replace(tagregex, function xml_tcmnt(x, idx) {
		var y/*:any*/ = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<?xml': break;

			/* 2.6.207 ThreadedComments CT_ThreadedComments */
			case '<ThreadedComments': break;
			case '</ThreadedComments>': break;

			/* 2.6.205 threadedComment CT_ThreadedComment */
			case '<threadedComment': comment = {author: y.personId, guid: y.id, ref: y.ref, T: 1}; break;
			case '</threadedComment>': if(comment.t != null) out.push(comment); break;

			case '<text>': case '<text': tidx = idx + x.length; break;
			case '</text>': comment.t = data.slice(tidx, idx).replace(/\r\n/g, "\n").replace(/\r/g, "\n"); break;

			/* 2.6.206 mentions CT_ThreadedCommentMentions TODO */
			case '<mentions': case '<mentions>': pass = true; break;
			case '</mentions>': pass = false; break;

			/* 2.6.202 mention CT_Mention TODO */

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': case '<extLst/>': break;
			/* 18.2.7  ext CT_Extension + */
			case '<ext': pass=true; break;
			case '</ext>': pass=false; break;

			default: if(!pass && opts.WTF) throw new Error('unrecognized ' + y[0] + ' in threaded comments');
		}
		return x;
	});
	return out;
}

function write_tcmnt_xml(comments, people, opts) {
	var o = [XML_HEADER, writextag('ThreadedComments', null, { 'xmlns': XMLNS.TCMNT }).replace(/[\/]>/, ">")];
	comments.forEach(function(carr) {
		var rootid = "";
		(carr[1] || []).forEach(function(c, idx) {
			if(!c.T) { delete c.ID; return; }
			if(c.a && people.indexOf(c.a) == -1) people.push(c.a);
			var tcopts = {
				ref: carr[0],
				id: "{54EE7951-7262-4200-6969-" + ("000000000000" + opts.tcid++).slice(-12) + "}"
			};
			if(idx == 0) rootid = tcopts.id;
			else tcopts.parentId = rootid;
			c.ID = tcopts.id;
			if(c.a) tcopts.personId = "{54EE7950-7262-4200-6969-" + ("000000000000" + people.indexOf(c.a)).slice(-12) + "}";
			o.push(writextag('threadedComment', writetag('text', c.t||""), tcopts));
		});
	});
	o.push('</ThreadedComments>');
	return o.join("");
}

/* [MS-XLSX] 2.1.18 */
function parse_people_xml(data/*:string*/, opts) {
	var out = [];
	var pass = false;
	data.replace(tagregex, function xml_tcmnt(x) {
		var y/*:any*/ = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<?xml': break;

			/* 2.4.85 personList CT_PersonList */
			case '<personList': break;
			case '</personList>': break;

			/* 2.6.203 person CT_Person TODO: providers */
			case '<person': out.push({name: y.displayname, id: y.id }); break;
			case '</person>': break;

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': case '<extLst/>': break;
			/* 18.2.7  ext CT_Extension + */
			case '<ext': pass=true; break;
			case '</ext>': pass=false; break;

			default: if(!pass && opts.WTF) throw new Error('unrecognized ' + y[0] + ' in threaded comments');
		}
		return x;
	});
	return out;
}
function write_people_xml(people/*, opts*/) {
	var o = [XML_HEADER, writextag('personList', null, {
		'xmlns': XMLNS.TCMNT,
		'xmlns:x': XMLNS_main[0]
	}).replace(/[\/]>/, ">")];
	people.forEach(function(person, idx) {
		o.push(writextag('person', null, {
			displayName: person,
			id: "{54EE7950-7262-4200-6969-" + ("000000000000" + idx).slice(-12) + "}",
			userId: person,
			providerId: "None"
		}));
	});
	o.push("</personList>");
	return o.join("");
}
var CT_VBA = "application/vnd.ms-office.vbaProject";
function make_vba_xls(cfb) {
  var newcfb = CFB.utils.cfb_new({ root: "R" });
  cfb.FullPaths.forEach(function(p, i) {
    if (p.slice(-1) === "/" || !p.match(/_VBA_PROJECT_CUR/))
      return;
    var newpath = p.replace(/^[^\/]*/, "R").replace(/\/_VBA_PROJECT_CUR\u0000*/, "");
    CFB.utils.cfb_add(newcfb, newpath, cfb.FileIndex[i].content);
  });
  return CFB.write(newcfb);
}
function fill_vba_xls(cfb, vba) {
  vba.FullPaths.forEach(function(p, i) {
    if (i == 0)
      return;
    var newpath = p.replace(/^[\/]*[^\/]*[\/]/, "/_VBA_PROJECT_CUR/");
    if (newpath.slice(-1) !== "/")
      CFB.utils.cfb_add(cfb, newpath, vba.FileIndex[i].content);
  });
}
var VBAFMTS = ["xlsb", "xlsm", "xlam", "biff8", "xla"];
/* macro and dialog sheet stubs */
function parse_ds_bin(/*::data:any, opts, idx:number, rels, wb, themes, styles*/)/*:Worksheet*/ { return {'!type':'dialog'}; }
function parse_ds_xml(/*::data:any, opts, idx:number, rels, wb, themes, styles*/)/*:Worksheet*/ { return {'!type':'dialog'}; }
function parse_ms_bin(/*::data:any, opts, idx:number, rels, wb, themes, styles*/)/*:Worksheet*/ { return {'!type':'macro'}; }
function parse_ms_xml(/*::data:any, opts, idx:number, rels, wb, themes, styles*/)/*:Worksheet*/ { return {'!type':'macro'}; }
/* TODO: it will be useful to parse the function str */
var rc_to_a1 = /*#__PURE__*/(function(){
	var rcregex = /(^|[^A-Za-z_])R(\[?-?\d+\]|[1-9]\d*|)C(\[?-?\d+\]|[1-9]\d*|)(?![A-Za-z0-9_])/g;
	var rcbase/*:Cell*/ = ({r:0,c:0}/*:any*/);
	function rcfunc($$,$1,$2,$3) {
		var cRel = false, rRel = false;

		if($2.length == 0) rRel = true;
		else if($2.charAt(0) == "[") { rRel = true; $2 = $2.slice(1, -1); }

		if($3.length == 0) cRel = true;
		else if($3.charAt(0) == "[") { cRel = true; $3 = $3.slice(1, -1); }

		var R = $2.length>0?parseInt($2,10)|0:0, C = $3.length>0?parseInt($3,10)|0:0;

		if(cRel) C += rcbase.c; else --C;
		if(rRel) R += rcbase.r; else --R;
		return $1 + (cRel ? "" : "$") + encode_col(C) + (rRel ? "" : "$") + encode_row(R);
	}
	return function rc_to_a1(fstr/*:string*/, base/*:Cell*/)/*:string*/ {
		rcbase = base;
		return fstr.replace(rcregex, rcfunc);
	};
})();

var crefregex = /(^|[^._A-Z0-9])(\$?)([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])(\$?)(\d{1,7})(?![_.\(A-Za-z0-9])/g;
try {
	crefregex = /(^|[^._A-Z0-9])([$]?)([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])([$]?)(10[0-3]\d{4}|104[0-7]\d{3}|1048[0-4]\d{2}|10485[0-6]\d|104857[0-6]|[1-9]\d{0,5})(?![_.\(A-Za-z0-9])/g;
}catch(e){}
var a1_to_rc = /*#__PURE__*/(function(){
	return function a1_to_rc(fstr/*:string*/, base/*:CellAddress*/) {
		return fstr.replace(crefregex, function($0, $1, $2, $3, $4, $5) {
			var c = decode_col($3) - ($2 ? 0 : base.c);
			var r = decode_row($5) - ($4 ? 0 : base.r);
			var R = $4 == "$" ? (r+1) : (r == 0 ? "" : "[" + r + "]");
			var C = $2 == "$" ? (c+1) : (c == 0 ? "" : "[" + c + "]");
			return $1 + "R" + R + "C" + C;
		});
	};
})();

/* no defined name can collide with a valid cell address A1:XFD1048576 ... except LOG10! */
function shift_formula_str(f/*:string*/, delta/*:Cell*/)/*:string*/ {
	return f.replace(crefregex, function($0, $1, $2, $3, $4, $5) {
		return $1+($2=="$" ? $2+$3 : encode_col(decode_col($3)+delta.c))+($4=="$" ? $4+$5 : encode_row(decode_row($5) + delta.r));
	});
}

function shift_formula_xlsx(f/*:string*/, range/*:string*/, cell/*:string*/)/*:string*/ {
	var r = decode_range(range), s = r.s, c = decode_cell(cell);
	var delta = {r:c.r - s.r, c:c.c - s.c};
	return shift_formula_str(f, delta);
}

/* TODO: parse formula */
function fuzzyfmla(f/*:string*/)/*:boolean*/ {
	if(f.length == 1) return false;
	return true;
}

function _xlfn(f/*:string*/)/*:string*/ {
	return f.replace(/_xlfn\./g,"");
}
/* Part 3 TODO: actually parse formulae */
function ods_to_csf_formula(f/*:string*/)/*:string*/ {
	if(f.slice(0,3) == "of:") f = f.slice(3);
	/* 5.2 Basic Expressions */
	if(f.charCodeAt(0) == 61) {
		f = f.slice(1);
		if(f.charCodeAt(0) == 61) f = f.slice(1);
	}
	f = f.replace(/COM\.MICROSOFT\./g, "");
	/* Part 3 Section 5.8 References */
	f = f.replace(/\[((?:\.[A-Z]+[0-9]+)(?::\.[A-Z]+[0-9]+)?)\]/g, function($$, $1) { return $1.replace(/\./g,""); });
	f = f.replace(/\$'([^']|'')+'/g, function($$) { return $$.slice(1); });
	f = f.replace(/\$([^\]\. #$]+)/g, function($$, $1) { return ($1).match(/^([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])?(10[0-3]\d{4}|104[0-7]\d{3}|1048[0-4]\d{2}|10485[0-6]\d|104857[0-6]|[1-9]\d{0,5})?$/) ? $$ : $1; });
	/* TODO: something other than this */
	f = f.replace(/\[.(#[A-Z]*[?!])\]/g, "$1");
	return f.replace(/[;~]/g,",").replace(/\|/g,";");
}

function csf_to_ods_formula(f/*:string*/)/*:string*/ {
	var o = "of:=" + f.replace(crefregex, "$1[.$2$3$4$5]").replace(/\]:\[/g,":");
	/* TODO: something other than this */
	return o.replace(/;/g, "|").replace(/,/g,";");
}

function ods_to_csf_3D(r/*:string*/)/*:[string, string]*/ {
	r = r.replace(/\$'([^']|'')+'/g, function($$) { return $$.slice(1); });
	r = r.replace(/\$([^\]\. #$]+)/g, function($$, $1) { return ($1).match(/^([A-Z]{1,2}|[A-W][A-Z]{2}|X[A-E][A-Z]|XF[A-D])?(10[0-3]\d{4}|104[0-7]\d{3}|1048[0-4]\d{2}|10485[0-6]\d|104857[0-6]|[1-9]\d{0,5})?$/) ? $$ : $1; });
	var a = r.split(":");
	var s = a[0].split(".")[0];
	return [s, a[0].split(".")[1] + (a.length > 1 ? (":" + (a[1].split(".")[1] || a[1].split(".")[0])) : "")];
}

function csf_to_ods_3D(r/*:string*/)/*:string*/ {
	return r.replace(/!/,".").replace(/:/, ":.");
}

var strs = {}; // shared strings
var _ssfopts = {}; // spreadsheet formatting options


/*global Map */
var browser_has_Map = typeof Map !== 'undefined';

function get_sst_id(sst/*:SST*/, str/*:string*/, rev)/*:number*/ {
	var i = 0, len = sst.length;
	if(rev) {
		if(browser_has_Map ? rev.has(str) : Object.prototype.hasOwnProperty.call(rev, str)) {
			var revarr = browser_has_Map ? rev.get(str) : rev[str];
			for(; i < revarr.length; ++i) {
				if(sst[revarr[i]].t === str) { sst.Count ++; return revarr[i]; }
			}
		}
	} else for(; i < len; ++i) {
		if(sst[i].t === str) { sst.Count ++; return i; }
	}
	sst[len] = ({t:str}/*:any*/); sst.Count ++; sst.Unique ++;
	if(rev) {
		if(browser_has_Map) {
			if(!rev.has(str)) rev.set(str, []);
			rev.get(str).push(len);
		} else {
			if(!Object.prototype.hasOwnProperty.call(rev, str)) rev[str] = [];
			rev[str].push(len);
		}
	}
	return len;
}

function col_obj_w(C/*:number*/, col) {
	var p = ({min:C+1,max:C+1}/*:any*/);
	/* wch (chars), wpx (pixels) */
	var wch = -1;
	if(col.MDW) MDW = col.MDW;
	if(col.width != null) p.customWidth = 1;
	else if(col.wpx != null) wch = px2char(col.wpx);
	else if(col.wch != null) wch = col.wch;
	if(wch > -1) { p.width = char2width(wch); p.customWidth = 1; }
	else if(col.width != null) p.width = col.width;
	if(col.hidden) p.hidden = true;
	if(col.level != null) { p.outlineLevel = p.level = col.level; }
	return p;
}

function default_margins(margins/*:Margins*/, mode/*:?string*/) {
	if(!margins) return;
	var defs = [0.7, 0.7, 0.75, 0.75, 0.3, 0.3];
	if(mode == 'xlml') defs = [1, 1, 1, 1, 0.5, 0.5];
	if(margins.left   == null) margins.left   = defs[0];
	if(margins.right  == null) margins.right  = defs[1];
	if(margins.top    == null) margins.top    = defs[2];
	if(margins.bottom == null) margins.bottom = defs[3];
	if(margins.header == null) margins.header = defs[4];
	if(margins.footer == null) margins.footer = defs[5];
}

function get_cell_style(styles/*:Array<any>*/, cell/*:Cell*/, opts) {
	var z = opts.revssf[cell.z != null ? cell.z : "General"];
	var i = 0x3c, len = styles.length;
	if(z == null && opts.ssf) {
		for(; i < 0x188; ++i) if(opts.ssf[i] == null) {
			SSF__load(cell.z, i);
			// $FlowIgnore
			opts.ssf[i] = cell.z;
			opts.revssf[cell.z] = z = i;
			break;
		}
	}
	for(i = 0; i != len; ++i) if(styles[i].numFmtId === z) return i;
	styles[len] = {
		numFmtId:z,
		fontId:0,
		fillId:0,
		borderId:0,
		xfId:0,
		applyNumberFormat:1
	};
	return len;
}

function safe_format(p/*:Cell*/, fmtid/*:number*/, fillid/*:?number*/, opts, themes, styles, date1904) {
	try {
		if(opts.cellNF) p.z = table_fmt[fmtid];
	} catch(e) { if(opts.WTF) throw e; }
	if(p.t === 'z' && !opts.cellStyles) return;
	if(p.t === 'd' && typeof p.v === 'string') p.v = parseDate(p.v);
	if((!opts || opts.cellText !== false) && p.t !== 'z') try {
		if(table_fmt[fmtid] == null) SSF__load(SSFImplicit[fmtid] || "General", fmtid);
		if(p.t === 'e') p.w = p.w || BErr[p.v];
		else if(fmtid === 0) {
			if(p.t === 'n') {
				if((p.v|0) === p.v) p.w = p.v.toString(10);
				else p.w = SSF_general_num(p.v);
			}
			else if(p.t === 'd') {
				var dd = datenum(p.v, !!date1904);
				if((dd|0) === dd) p.w = dd.toString(10);
				else p.w = SSF_general_num(dd);
			}
			else if(p.v === undefined) return "";
			else p.w = SSF_general(p.v,_ssfopts);
		}
		else if(p.t === 'd') p.w = SSF_format(fmtid,datenum(p.v, !!date1904),_ssfopts);
		else p.w = SSF_format(fmtid,p.v,_ssfopts);
	} catch(e) { if(opts.WTF) throw e; }
	if(!opts.cellStyles) return;
	if(fillid != null) try {
		p.s = styles.Fills[fillid];
		if (p.s.fgColor && p.s.fgColor.theme && !p.s.fgColor.rgb) {
			p.s.fgColor.rgb = rgb_tint(themes.themeElements.clrScheme[p.s.fgColor.theme].rgb, p.s.fgColor.tint || 0);
			if(opts.WTF) p.s.fgColor.raw_rgb = themes.themeElements.clrScheme[p.s.fgColor.theme].rgb;
		}
		if (p.s.bgColor && p.s.bgColor.theme) {
			p.s.bgColor.rgb = rgb_tint(themes.themeElements.clrScheme[p.s.bgColor.theme].rgb, p.s.bgColor.tint || 0);
			if(opts.WTF) p.s.bgColor.raw_rgb = themes.themeElements.clrScheme[p.s.bgColor.theme].rgb;
		}
	} catch(e) { if(opts.WTF && styles.Fills) throw e; }
}

function check_ws(ws/*:Worksheet*/, sname/*:string*/, i/*:number*/) {
	if(ws && ws['!ref']) {
		var range = safe_decode_range(ws['!ref']);
		if(range.e.c < range.s.c || range.e.r < range.s.r) throw new Error("Bad range (" + i + "): " + ws['!ref']);
	}
}
function parse_ws_xml_dim(ws/*:Worksheet*/, s/*:string*/) {
	var d = safe_decode_range(s);
	if(d.s.r<=d.e.r && d.s.c<=d.e.c && d.s.r>=0 && d.s.c>=0) ws["!ref"] = encode_range(d);
}
var mergecregex = /<(?:\w+:)?mergeCell ref=["'][A-Z0-9:]+['"]\s*[\/]?>/g;
var hlinkregex = /<(?:\w+:)?hyperlink [^<>]*>/mg;
var dimregex = /"(\w*:\w*)"/;
var colregex = /<(?:\w+:)?col\b[^<>]*[\/]?>/g;
var afregex = /<(?:\w+:)?autoFilter[^>]*/g;
var marginregex= /<(?:\w+:)?pageMargins[^<>]*\/>/g;
var sheetprregex = /<(?:\w+:)?sheetPr\b[^<>]*?\/>/;

/* 18.3 Worksheets */
function parse_ws_xml(data/*:?string*/, opts, idx/*:number*/, rels, wb/*:WBWBProps*/, themes, styles)/*:Worksheet*/ {
	if(!data) return data;
	if(!rels) rels = {'!id':{}};
	if(DENSE != null && opts.dense == null) opts.dense = DENSE;

	/* 18.3.1.99 worksheet CT_Worksheet */
	var s = ({}/*:any*/); if(opts.dense) s["!data"] = [];
	var refguess/*:Range*/ = ({s: {r:2000000, c:2000000}, e: {r:0, c:0} }/*:any*/);

	var data1 = "", data2 = "";
	var mtch/*:?any*/ = str_match_xml_ns(data, "sheetData");
	if(mtch) {
		data1 = data.slice(0, mtch.index);
		data2 = data.slice(mtch.index + mtch[0].length);
	} else data1 = data2 = data;

	/* 18.3.1.82 sheetPr CT_SheetPr */
	var sheetPr = data1.match(sheetprregex);
	if(sheetPr) parse_ws_xml_sheetpr(sheetPr[0], s, wb, idx);
	else if((sheetPr = str_match_xml_ns(data1, "sheetPr"))) parse_ws_xml_sheetpr2(sheetPr[0], sheetPr[1]||"", s, wb, idx, styles, themes);

	/* 18.3.1.35 dimension CT_SheetDimension */
	var ridx = (data1.match(/<(?:\w*:)?dimension/)||{index:-1}).index;
	if(ridx > 0) {
		var ref = data1.slice(ridx,ridx+50).match(dimregex);
		if(ref && !(opts && opts.nodim)) parse_ws_xml_dim(s, ref[1]);
	}

	/* 18.3.1.88 sheetViews CT_SheetViews */
	var svs = str_match_xml_ns(data1, "sheetViews");
	if(svs && svs[1]) parse_ws_xml_sheetviews(svs[1], wb);

	/* 18.3.1.17 cols CT_Cols */
	var columns/*:Array<ColInfo>*/ = [];
	if(opts.cellStyles) {
		/* 18.3.1.13 col CT_Col */
		var cols = data1.match(colregex);
		if(cols) parse_ws_xml_cols(columns, cols);
	}

	/* 18.3.1.80 sheetData CT_SheetData ? */
	if(mtch) parse_ws_xml_data(mtch[1], s, opts, refguess, themes, styles, wb);

	/* 18.3.1.2  autoFilter CT_AutoFilter */
	var afilter = data2.match(afregex);
	if(afilter) s['!autofilter'] = parse_ws_xml_autofilter(afilter[0]);

	/* 18.3.1.55 mergeCells CT_MergeCells */
	var merges/*:Array<Range>*/ = [];
	var _merge = data2.match(mergecregex);
	if(_merge) for(ridx = 0; ridx != _merge.length; ++ridx)
		merges[ridx] = safe_decode_range(_merge[ridx].slice(_merge[ridx].indexOf("\"")+1));

	/* 18.3.1.48 hyperlinks CT_Hyperlinks */
	var hlink = data2.match(hlinkregex);
	if(hlink) parse_ws_xml_hlinks(s, hlink, rels);

	/* 18.3.1.62 pageMargins CT_PageMargins */
	var margins = data2.match(marginregex);
	if(margins) s['!margins'] = parse_ws_xml_margins(parsexmltag(margins[0]));

	/* legacyDrawing */
	var m;
	if((m = data2.match(/legacyDrawing r:id="(.*?)"/))) s['!legrel'] = m[1];

	if(opts && opts.nodim) refguess.s.c = refguess.s.r = 0;
	if(!s["!ref"] && refguess.e.c >= refguess.s.c && refguess.e.r >= refguess.s.r) s["!ref"] = encode_range(refguess);
	if(opts.sheetRows > 0 && s["!ref"]) {
		var tmpref = safe_decode_range(s["!ref"]);
		if(opts.sheetRows <= +tmpref.e.r) {
			tmpref.e.r = opts.sheetRows - 1;
			if(tmpref.e.r > refguess.e.r) tmpref.e.r = refguess.e.r;
			if(tmpref.e.r < tmpref.s.r) tmpref.s.r = tmpref.e.r;
			if(tmpref.e.c > refguess.e.c) tmpref.e.c = refguess.e.c;
			if(tmpref.e.c < tmpref.s.c) tmpref.s.c = tmpref.e.c;
			s["!fullref"] = s["!ref"];
			s["!ref"] = encode_range(tmpref);
		}
	}
	if(columns.length > 0) s["!cols"] = columns;
	if(merges.length > 0) s["!merges"] = merges;
	if(rels['!id'][s['!legrel']]) s['!legdrawel'] = rels['!id'][s['!legrel']];
	return s;
}

function write_ws_xml_merges(merges/*:Array<Range>*/)/*:string*/ {
	if(merges.length === 0) return "";
	var o = '<mergeCells count="' + merges.length + '">';
	for(var i = 0; i != merges.length; ++i) o += '<mergeCell ref="' + encode_range(merges[i]) + '"/>';
	return o + '</mergeCells>';
}

/* 18.3.1.82-3 sheetPr CT_ChartsheetPr / CT_SheetPr */
function parse_ws_xml_sheetpr(sheetPr/*:string*/, s, wb/*:WBWBProps*/, idx/*:number*/) {
	var data = parsexmltag(sheetPr);
	if(!wb.Sheets[idx]) wb.Sheets[idx] = {};
	if(data.codeName) wb.Sheets[idx].CodeName = unescapexml(utf8read(data.codeName));
}
function parse_ws_xml_sheetpr2(sheetPr/*:string*/, body/*:string*/, s, wb/*:WBWBProps*/, idx/*:number*/) {
	parse_ws_xml_sheetpr(sheetPr.slice(0, sheetPr.indexOf(">")), s, wb, idx);
}
function write_ws_xml_sheetpr(ws, wb, idx, opts, o) {
	var needed = false;
	var props = {}, payload = null;
	if(opts.bookType !== 'xlsx' && wb.vbaraw) {
		var cname = wb.SheetNames[idx];
		try { if(wb.Workbook) cname = wb.Workbook.Sheets[idx].CodeName || cname; } catch(e) {}
		needed = true;
		props.codeName = utf8write(escapexml(cname));
	}

	if(ws && ws["!outline"]) {
		var outlineprops = {summaryBelow:1, summaryRight:1};
		if(ws["!outline"].above) outlineprops.summaryBelow = 0;
		if(ws["!outline"].left) outlineprops.summaryRight = 0;
		payload = (payload||"") + writextag('outlinePr', null, outlineprops);
	}

	if(!needed && !payload) return;
	o[o.length] = (writextag('sheetPr', payload, props));
}

/* 18.3.1.85 sheetProtection CT_SheetProtection */
var sheetprot_deffalse = ["objects", "scenarios", "selectLockedCells", "selectUnlockedCells"];
var sheetprot_deftrue = [
	"formatColumns", "formatRows", "formatCells",
	"insertColumns", "insertRows", "insertHyperlinks",
	"deleteColumns", "deleteRows",
	"sort", "autoFilter", "pivotTables"
];
function write_ws_xml_protection(sp)/*:string*/ {
	// algorithmName, hashValue, saltValue, spinCount
	var o = ({sheet:1}/*:any*/);
	sheetprot_deffalse.forEach(function(n) { if(sp[n] != null && sp[n]) o[n] = "1"; });
	sheetprot_deftrue.forEach(function(n) { if(sp[n] != null && !sp[n]) o[n] = "0"; });
	/* TODO: algorithm */
	if(sp.password) o.password = crypto_CreatePasswordVerifier_Method1(sp.password).toString(16).toUpperCase();
	return writextag('sheetProtection', null, o);
}

function parse_ws_xml_hlinks(s, data/*:Array<string>*/, rels) {
	var dense = s["!data"] != null;
	for(var i = 0; i != data.length; ++i) {
		var val = parsexmltag(utf8read(data[i]), true);
		if(!val.ref) return;
		var rel = ((rels || {})['!id']||[])[val.id];
		if(rel) {
			val.Target = rel.Target;
			if(val.location) val.Target += "#"+unescapexml(val.location);
		} else {
			val.Target = "#" + unescapexml(val.location);
			rel = {Target: val.Target, TargetMode: 'Internal'};
		}
		val.Rel = rel;
		if(val.tooltip) { val.Tooltip = val.tooltip; delete val.tooltip; }
		var rng = safe_decode_range(val.ref);
		for(var R=rng.s.r;R<=rng.e.r;++R) for(var C=rng.s.c;C<=rng.e.c;++C) {
			var addr = encode_col(C) + encode_row(R);
			if(dense) {
				if(!s["!data"][R]) s["!data"][R] = [];
				if(!s["!data"][R][C]) s["!data"][R][C] = {t:"z",v:undefined};
				s["!data"][R][C].l = val;
			} else {
				if(!s[addr]) s[addr] = {t:"z",v:undefined};
				s[addr].l = val;
			}
		}
	}
}

function parse_ws_xml_margins(margin) {
	var o = {};
	["left", "right", "top", "bottom", "header", "footer"].forEach(function(k) {
		if(margin[k]) o[k] = parseFloat(margin[k]);
	});
	return o;
}
function write_ws_xml_margins(margin)/*:string*/ {
	default_margins(margin);
	return writextag('pageMargins', null, margin);
}

function parse_ws_xml_cols(columns, cols) {
	var seencol = false;
	for(var coli = 0; coli != cols.length; ++coli) {
		var coll = parsexmltag(cols[coli], true);
		if(coll.hidden) coll.hidden = parsexmlbool(coll.hidden);
		var colm=parseInt(coll.min, 10)-1, colM=parseInt(coll.max,10)-1;
		if(coll.outlineLevel) coll.level = (+coll.outlineLevel || 0);
		delete coll.min; delete coll.max; coll.width = +coll.width;
		if(!seencol && coll.width) { seencol = true; find_mdw_colw(coll.width); }
		process_col(coll);
		while(colm <= colM) columns[colm++] = dup(coll);
	}
}
function write_ws_xml_cols(ws, cols)/*:string*/ {
	var o = ["<cols>"], col;
	for(var i = 0; i != cols.length; ++i) {
		if(!(col = cols[i])) continue;
		o[o.length] = (writextag('col', null, col_obj_w(i, col)));
	}
	o[o.length] = "</cols>";
	return o.join("");
}

function parse_ws_xml_autofilter(data/*:string*/) {
	var o = { ref: (data.match(/ref="([^"]*)"/)||[])[1]};
	return o;
}
function write_ws_xml_autofilter(data, ws, wb, idx)/*:string*/ {
	var ref = typeof data.ref == "string" ? data.ref : encode_range(data.ref);
	if(!wb.Workbook) wb.Workbook = ({Sheets:[]}/*:any*/);
	if(!wb.Workbook.Names) wb.Workbook.Names = [];
	var names/*: Array<any> */ = wb.Workbook.Names;
	var range = decode_range(ref);
	if(range.s.r == range.e.r) { range.e.r = decode_range(ws["!ref"]).e.r; ref = encode_range(range); }
	for(var i = 0; i < names.length; ++i) {
		var name = names[i];
		if(name.Name != '_xlnm._FilterDatabase') continue;
		if(name.Sheet != idx) continue;
		name.Ref = formula_quote_sheet_name(wb.SheetNames[idx]) + "!" + fix_range(ref); break;
	}
	if(i == names.length) names.push({ Name: '_xlnm._FilterDatabase', Sheet: idx, Ref: "'" + wb.SheetNames[idx] + "'!" + ref  });
	return writextag("autoFilter", null, {ref:ref});
}

/* 18.3.1.88 sheetViews CT_SheetViews */
/* 18.3.1.87 sheetView CT_SheetView */
var sviewregex = /<(?:\w:)?sheetView(?:[^<>a-z][^<>]*)?\/?>/g;
function parse_ws_xml_sheetviews(data, wb/*:WBWBProps*/) {
	if(!wb.Views) wb.Views = [{}];
	(data.match(sviewregex)||[]).forEach(function(r/*:string*/, i/*:number*/) {
		var tag = parsexmltag(r);
		// $FlowIgnore
		if(!wb.Views[i]) wb.Views[i] = {};
		// $FlowIgnore
		if(+tag.zoomScale) wb.Views[i].zoom = +tag.zoomScale;
		// $FlowIgnore
		if(tag.rightToLeft && parsexmlbool(tag.rightToLeft)) wb.Views[i].RTL = true;
	});
}
function write_ws_xml_sheetviews(ws, opts, idx, wb)/*:string*/ {
	var sview = ({workbookViewId:"0"}/*:any*/);
	// $FlowIgnore
	if((((wb||{}).Workbook||{}).Views||[])[0]) sview.rightToLeft = wb.Workbook.Views[0].RTL ? "1" : "0";
	return writextag("sheetViews", writextag("sheetView", null, sview), {});
}

function write_ws_xml_cell(cell/*:Cell*/, ref, ws, opts, idx, wb, date1904)/*:string*/ {
	if(cell.c) ws['!comments'].push([ref, cell.c]);
	if((cell.v === undefined || cell.t === "z" && !(opts||{}).sheetStubs) && typeof cell.f !== "string" && typeof cell.z == "undefined") return "";
	var vv = "";
	var oldt = cell.t, oldv = cell.v;
	if(cell.t !== "z") switch(cell.t) {
		case 'b': vv = cell.v ? "1" : "0"; break;
		case 'n':
			if(isNaN(cell.v)) { cell.t = "e"; vv = BErr[cell.v = 0x24]; } // #NUM!
			else if(!isFinite(cell.v)) { cell.t = "e"; vv = BErr[cell.v = 0x07]; } // #DIV/0!
			else vv = ''+cell.v; break;
		case 'e': vv = BErr[cell.v]; break;
		case 'd':
			if(opts && opts.cellDates) {
				var _vv = parseDate(cell.v, date1904);
				vv = _vv.toISOString();
				if(_vv.getUTCFullYear() < 1900) vv = vv.slice(vv.indexOf("T") + 1).replace("Z","");
			} else {
				cell = dup(cell);
				cell.t = 'n';
				vv = ''+(cell.v = datenum(parseDate(cell.v, date1904), date1904));
			}
			if(typeof cell.z === 'undefined') cell.z = table_fmt[14];
			break;
		default: vv = cell.v; break;
	}
	var v = (cell.t == "z" || cell.v == null)? "" : writetag('v', escapexml(vv)), o = ({r:ref}/*:any*/);
	/* TODO: cell style */
	var os = get_cell_style(opts.cellXfs, cell, opts);
	if(os !== 0) o.s = os;
	switch(cell.t) {
		case 'n': break;
		case 'd': o.t = "d"; break;
		case 'b': o.t = "b"; break;
		case 'e': o.t = "e"; break;
		case 'z': break;
		default: if(cell.v == null) { delete cell.t; break; }
			if(cell.v.length > 32767) throw new Error("Text length must not exceed 32767 characters");
			if(opts && opts.bookSST) {
				v = writetag('v', ''+get_sst_id(opts.Strings, cell.v, opts.revStrings));
				o.t = "s"; break;
			}
			else o.t = "str"; break;
	}
	if(cell.t != oldt) { cell.t = oldt; cell.v = oldv; }
	if(typeof cell.f == "string" && cell.f) {
		var ff = cell.F && cell.F.slice(0, ref.length) == ref ? {t:"array", ref:cell.F} : null;
		v = writextag('f', escapexml(cell.f), ff) + (cell.v != null ? v : "");
	}
	if(cell.l) {
		cell.l.display = escapexml(vv);
		ws['!links'].push([ref, cell.l]);
	}
	if(cell.D) o.cm = 1;
	return writextag('c', v, o);
}

var parse_ws_xml_data = /*#__PURE__*/(function() {
	var cellregex = /<(?:\w+:)?c[ \/>]/, rowregex = /<\/(?:\w+:)?row>/;
	var rregex = /r=["']([^"']*)["']/;
	var refregex = /ref=["']([^"']*)["']/;

return function parse_ws_xml_data(sdata/*:string*/, s, opts, guess/*:Range*/, themes, styles, wb) {
	var ri = 0, x = "", cells/*:Array<string>*/ = [], cref/*:?Array<string>*/ = [], idx=0, i=0, cc=0, d="", p/*:any*/;
	var tag, tagr = 0, tagc = 0;
	var sstr, ftag;
	var fmtid = 0, fillid = 0;
	var do_format = Array.isArray(styles.CellXf), cf;
	var arrayf/*:Array<[Range, string]>*/ = [];
	var sharedf = [];
	var dense = s["!data"] != null;
	var rows/*:Array<RowInfo>*/ = [], rowobj = {}, rowrite = false;
	var sheetStubs = !!opts.sheetStubs;
	var date1904 = !!((wb||{}).WBProps||{}).date1904;
	for(var marr = sdata.split(rowregex), mt = 0, marrlen = marr.length; mt != marrlen; ++mt) {
		x = marr[mt].trim();
		var xlen = x.length;
		if(xlen === 0) continue;

		/* 18.3.1.73 row CT_Row */
		var rstarti = 0;
		outa: for(ri = 0; ri < xlen; ++ri) switch(/*x.charCodeAt(ri)*/x[ri]) {
			case ">" /*62*/:
				if(/*x.charCodeAt(ri-1) != 47*/x[ri-1] != "/") { ++ri; break outa; }
				if(opts && opts.cellStyles) {
					// TODO: avoid duplication
					tag = parsexmltag(x.slice(rstarti,ri), true);
					tagr = tag.r != null ? parseInt(tag.r, 10) : tagr+1; tagc = -1;
					if(opts.sheetRows && opts.sheetRows < tagr) continue;
					rowobj = {}; rowrite = false;
					if(tag.ht) { rowrite = true; rowobj.hpt = parseFloat(tag.ht); rowobj.hpx = pt2px(rowobj.hpt); }
					if(tag.hidden && parsexmlbool(tag.hidden)) { rowrite = true; rowobj.hidden = true; }
					if(tag.outlineLevel != null) { rowrite = true; rowobj.level = +tag.outlineLevel; }
					if(rowrite) rows[tagr-1] = rowobj;
				}
				break;
			case "<" /*60*/: rstarti = ri; break;
		}
		if(rstarti >= ri) break;
		tag = parsexmltag(x.slice(rstarti,ri), true);
		tagr = tag.r != null ? parseInt(tag.r, 10) : tagr+1; tagc = -1;
		if(opts.sheetRows && opts.sheetRows < tagr) continue;
		if(!opts.nodim) {
			if(guess.s.r > tagr - 1) guess.s.r = tagr - 1;
			if(guess.e.r < tagr - 1) guess.e.r = tagr - 1;
		}

		if(opts && opts.cellStyles) {
			rowobj = {}; rowrite = false;
			if(tag.ht) { rowrite = true; rowobj.hpt = parseFloat(tag.ht); rowobj.hpx = pt2px(rowobj.hpt); }
			if(tag.hidden && parsexmlbool(tag.hidden)) { rowrite = true; rowobj.hidden = true; }
			if(tag.outlineLevel != null) { rowrite = true; rowobj.level = +tag.outlineLevel; }
			if(rowrite) rows[tagr-1] = rowobj;
		}

		/* 18.3.1.4 c CT_Cell */
		cells = x.slice(ri).split(cellregex);
		for(var rslice = 0; rslice != cells.length; ++rslice) if(cells[rslice].trim().charAt(0) != "<") break;
		cells = cells.slice(rslice);
		for(ri = 0; ri != cells.length; ++ri) {
			x = cells[ri].trim();
			if(x.length === 0) continue;
			cref = x.match(rregex); idx = ri; i=0; cc=0;
			x = "<c " + (x.slice(0,1)=="<"?">":"") + x;
			if(cref != null && cref.length === 2) {
				idx = 0; d=cref[1];
				for(i=0; i != d.length; ++i) {
					if((cc=d.charCodeAt(i)-64) < 1 || cc > 26) break;
					idx = 26*idx + cc;
				}
				--idx;
				tagc = idx;
			} else ++tagc;
			for(i = 0; i != x.length; ++i) if(x.charCodeAt(i) === 62) break; ++i;
			tag = parsexmltag(x.slice(0,i), true);
			if(!tag.r) tag.r = encode_cell({r:tagr-1, c:tagc});
			d = x.slice(i);
			p = ({t:""}/*:any*/);

			if((cref=str_match_xml_ns(d, "v"))!= null && /*::cref != null && */cref[1] !== '') p.v=unescapexml(cref[1]);
			if(opts.cellFormula) {
				if((cref=str_match_xml_ns(d, "f"))!= null /*:: && cref != null*/) {
					if(cref[1] == "") {
						if(/*::cref != null && cref[0] != null && */cref[0].indexOf('t="shared"') > -1) {
							// TODO: parse formula
							ftag = parsexmltag(cref[0]);
							if(sharedf[ftag.si]) p.f = shift_formula_xlsx(sharedf[ftag.si][1], sharedf[ftag.si][2]/*[0].ref*/, tag.r);
						}
					} else {
						/* TODO: match against XLSXFutureFunctions */
						p.f=unescapexml(utf8read(cref[1]), true);
						if(!opts.xlfn) p.f = _xlfn(p.f);
						if(/*::cref != null && cref[0] != null && */cref[0].indexOf('t="array"') > -1) {
							p.F = (d.match(refregex)||[])[1];
							if(p.F.indexOf(":") > -1) arrayf.push([safe_decode_range(p.F), p.F]);
						} else if(/*::cref != null && cref[0] != null && */cref[0].indexOf('t="shared"') > -1) {
							// TODO: parse formula
							ftag = parsexmltag(cref[0]);
							var ___f = unescapexml(utf8read(cref[1]));
							if(!opts.xlfn) ___f = _xlfn(___f);
							sharedf[parseInt(ftag.si, 10)] = [ftag, ___f, tag.r];
						}
					}
				} else if((cref=d.match(/<f[^<>]*\/>/))) {
					ftag = parsexmltag(cref[0]);
					if(sharedf[ftag.si]) p.f = shift_formula_xlsx(sharedf[ftag.si][1], sharedf[ftag.si][2]/*[0].ref*/, tag.r);
				}
				/* TODO: factor out contains logic */
				var _tag = decode_cell(tag.r);
				for(i = 0; i < arrayf.length; ++i)
					if(_tag.r >= arrayf[i][0].s.r && _tag.r <= arrayf[i][0].e.r)
						if(_tag.c >= arrayf[i][0].s.c && _tag.c <= arrayf[i][0].e.c)
							p.F = arrayf[i][1];
			}

			if(tag.t == null && p.v === undefined) {
				if(p.f || p.F) {
					p.v = 0; p.t = "n";
				} else if(!sheetStubs) continue;
				else p.t = "z";
			}
			else p.t = tag.t || "n";
			if(guess.s.c > tagc) guess.s.c = tagc;
			if(guess.e.c < tagc) guess.e.c = tagc;
			/* 18.18.11 t ST_CellType */
			switch(p.t) {
				case 'n':
					if(p.v == "" || p.v == null) {
						if(!sheetStubs) continue;
						p.t = 'z';
					} else p.v = parseFloat(p.v);
					break;
				case 's':
					if(typeof p.v == 'undefined') {
						if(!sheetStubs) continue;
						p.t = 'z';
					} else {
						sstr = strs[parseInt(p.v, 10)];
						p.v = sstr.t;
						p.r = sstr.r;
						if(opts.cellHTML) p.h = sstr.h;
					}
					break;
				case 'str':
					p.t = "s";
					p.v = (p.v!=null) ? unescapexml(utf8read(p.v), true) : '';
					if(opts.cellHTML) p.h = escapehtml(p.v);
					break;
				case 'inlineStr':
					cref = str_match_xml_ns(d, "is");
					p.t = 's';
					if(cref != null && (sstr = parse_si(cref[1]))) {
						p.v = sstr.t;
						if(opts.cellHTML) p.h = sstr.h;
					} else p.v = "";
					break;
				case 'b': p.v = parsexmlbool(p.v); break;
				case 'd':
					if(opts.cellDates) p.v = parseDate(p.v, date1904);
					else { p.v = datenum(parseDate(p.v, date1904), date1904); p.t = 'n'; }
					break;
				/* error string in .w, number in .v */
				case 'e':
					if(!opts || opts.cellText !== false) p.w = p.v;
					p.v = RBErr[p.v]; break;
			}
			/* formatting */
			fmtid = fillid = 0;
			cf = null;
			if(do_format && tag.s !== undefined) {
				cf = styles.CellXf[tag.s];
				if(cf != null) {
					if(cf.numFmtId != null) fmtid = cf.numFmtId;
					if(opts.cellStyles) {
						if(cf.fillId != null) fillid = cf.fillId;
					}
				}
			}
			safe_format(p, fmtid, fillid, opts, themes, styles, date1904);
			if(opts.cellDates && do_format && p.t == 'n' && fmt_is_date(table_fmt[fmtid])) { p.v = numdate(p.v + (date1904 ? 1462 : 0)); p.t = typeof p.v == "number" ? 'n' : 'd'; }
			if(tag.cm && opts.xlmeta) {
				var cm = (opts.xlmeta.Cell||[])[+tag.cm-1];
				if(cm && cm.type == 'XLDAPR') p.D = true;
			}
			var _r;
			if(opts.nodim) {
				_r = decode_cell(tag.r);
				if(guess.s.r > _r.r) guess.s.r = _r.r;
				if(guess.e.r < _r.r) guess.e.r = _r.r;
			}
			if(dense) {
				_r = decode_cell(tag.r);
				if(!s["!data"][_r.r]) s["!data"][_r.r] = [];
				s["!data"][_r.r][_r.c] = p;
			} else s[tag.r] = p;
		}
	}
	if(rows.length > 0) s['!rows'] = rows;
}; })();

function write_ws_xml_data(ws/*:Worksheet*/, opts, idx/*:number*/, wb/*:Workbook*//*::, rels*/)/*:string*/ {
	var o/*:Array<string>*/ = [], r/*:Array<string>*/ = [], range = safe_decode_range(ws['!ref']), cell="", ref, rr = "", cols/*:Array<string>*/ = [], R=0, C=0, rows = ws['!rows'];
	var dense = ws["!data"] != null;
	var params = ({r:rr}/*:any*/), row/*:RowInfo*/, height = -1;
	var date1904 = (((wb||{}).Workbook||{}).WBProps||{}).date1904;
	for(C = range.s.c; C <= range.e.c; ++C) cols[C] = encode_col(C);
	for(R = range.s.r; R <= range.e.r; ++R) {
		r = [];
		rr = encode_row(R);
		for(C = range.s.c; C <= range.e.c; ++C) {
			ref = cols[C] + rr;
			var _cell = dense ? (ws["!data"][R]||[])[C]: ws[ref];
			if(_cell === undefined) continue;
			if((cell = write_ws_xml_cell(_cell, ref, ws, opts, idx, wb, date1904)) != null) r.push(cell);
		}
		if(r.length > 0 || (rows && rows[R])) {
			params = ({r:rr}/*:any*/);
			if(rows && rows[R]) {
				row = rows[R];
				if(row.hidden) params.hidden = 1;
				height = -1;
				if(row.hpx) height = px2pt(row.hpx);
				else if(row.hpt) height = row.hpt;
				if(height > -1) { params.ht = height; params.customHeight = 1; }
				if(row.level) { params.outlineLevel = row.level; }
			}
			o[o.length] = (writextag('row', r.join(""), params));
		}
	}
	if(rows) for(; R < rows.length; ++R) {
		if(rows && rows[R]) {
			params = ({r:R+1}/*:any*/);
			row = rows[R];
			if(row.hidden) params.hidden = 1;
			height = -1;
			if (row.hpx) height = px2pt(row.hpx);
			else if (row.hpt) height = row.hpt;
			if (height > -1) { params.ht = height; params.customHeight = 1; }
			if (row.level) { params.outlineLevel = row.level; }
			o[o.length] = (writextag('row', "", params));
		}
	}
	return o.join("");
}

function write_ws_xml(idx/*:number*/, opts, wb/*:Workbook*/, rels)/*:string*/ {
	var o = [XML_HEADER, writextag('worksheet', null, {
		'xmlns': XMLNS_main[0],
		'xmlns:r': XMLNS.r
	})];
	var s = wb.SheetNames[idx], sidx = 0, rdata = "";
	var ws = wb.Sheets[s];
	if(ws == null) ws = {};
	var ref = ws['!ref'] || 'A1';
	var range = safe_decode_range(ref);
	if(range.e.c > 0x3FFF || range.e.r > 0xFFFFF) {
		if(opts.WTF) throw new Error("Range " + ref + " exceeds format limit A1:XFD1048576");
		range.e.c = Math.min(range.e.c, 0x3FFF);
		range.e.r = Math.min(range.e.c, 0xFFFFF);
		ref = encode_range(range);
	}
	if(!rels) rels = {};
	ws['!comments'] = [];
	var _drawing = [];

	write_ws_xml_sheetpr(ws, wb, idx, opts, o);

	o[o.length] = (writextag('dimension', null, {'ref': ref}));

	o[o.length] = write_ws_xml_sheetviews(ws, opts, idx, wb);

	/* TODO: store in WB, process styles */
	if(opts.sheetFormat) o[o.length] = (writextag('sheetFormatPr', null, {
		defaultRowHeight:opts.sheetFormat.defaultRowHeight||'16',
		baseColWidth:opts.sheetFormat.baseColWidth||'10',
		outlineLevelRow:opts.sheetFormat.outlineLevelRow||'7'
	}));

	if(ws['!cols'] != null && ws['!cols'].length > 0) o[o.length] = (write_ws_xml_cols(ws, ws['!cols']));

	o[sidx = o.length] = '<sheetData/>';
	ws['!links'] = [];
	if(ws['!ref'] != null) {
		rdata = write_ws_xml_data(ws, opts, idx, wb, rels);
		if(rdata.length > 0) o[o.length] = (rdata);
	}
	if(o.length>sidx+1) { o[o.length] = ('</sheetData>'); o[sidx]=o[sidx].replace("/>",">"); }

	/* sheetCalcPr */

	if(ws['!protect']) o[o.length] = write_ws_xml_protection(ws['!protect']);

	/* protectedRanges */
	/* scenarios */

	if(ws['!autofilter'] != null) o[o.length] = write_ws_xml_autofilter(ws['!autofilter'], ws, wb, idx);

	/* sortState */
	/* dataConsolidate */
	/* customSheetViews */

	if(ws['!merges'] != null && ws['!merges'].length > 0) o[o.length] = (write_ws_xml_merges(ws['!merges']));

	/* phoneticPr */
	/* conditionalFormatting */
	/* dataValidations */

	var relc = -1, rel, rId = -1;
	if(/*::(*/ws['!links']/*::||[])*/.length > 0) {
		o[o.length] = "<hyperlinks>";
		/*::(*/ws['!links']/*::||[])*/.forEach(function(l) {
			if(!l[1].Target) return;
			rel = ({"ref":l[0]}/*:any*/);
			if(l[1].Target.charAt(0) != "#") {
				rId = add_rels(rels, -1, escapexml(l[1].Target).replace(/#[\s\S]*$/, ""), RELS.HLINK);
				rel["r:id"] = "rId"+rId;
			}
			if((relc = l[1].Target.indexOf("#")) > -1) rel.location = escapexml(l[1].Target.slice(relc+1));
			if(l[1].Tooltip) rel.tooltip = escapexml(l[1].Tooltip);
			rel.display = l[1].display;
			o[o.length] = writextag("hyperlink",null,rel);
		});
		o[o.length] = "</hyperlinks>";
	}
	delete ws['!links'];

	/* printOptions */

	if(ws['!margins'] != null) o[o.length] =  write_ws_xml_margins(ws['!margins']);

	/* pageSetup */
	/* headerFooter */
	/* rowBreaks */
	/* colBreaks */
	/* customProperties */
	/* cellWatches */

	if(!opts || opts.ignoreEC || (opts.ignoreEC == (void 0))) o[o.length] = writetag("ignoredErrors", writextag("ignoredError", null, {numberStoredAsText:1, sqref:ref}));

	/* smartTags */

	if(_drawing.length > 0) {
		rId = add_rels(rels, -1, "../drawings/drawing" + (idx+1) + ".xml", RELS.DRAW);
		o[o.length] = writextag("drawing", null, {"r:id":"rId" + rId});
		ws['!drawing'] = _drawing;
	}

	if(ws['!comments'].length > 0) {
		rId = add_rels(rels, -1, "../drawings/vmlDrawing" + (idx+1) + ".vml", RELS.VML);
		o[o.length] = writextag("legacyDrawing", null, {"r:id":"rId" + rId});
		ws['!legacy'] = rId;
	}

	/* legacyDrawingHF */
	/* picture */
	/* oleObjects */
	/* controls */
	/* webPublishItems */
	/* tableParts */
	/* extLst */

	if(o.length>1) { o[o.length] = ('</worksheet>'); o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
function parse_Cache(data/*:string*/)/*:[Array<number|string>, string, ?string]*/ {
	var col/*:Array<number|string>*/ = [];
	var num = data.match(/^<c:numCache>/);
	var f;

	/* 21.2.2.150 pt CT_NumVal */
	(data.match(/<c:pt idx="(\d*)"[^<>\/]*><c:v>([^<])<\/c:v><\/c:pt>/mg)||[]).forEach(function(pt) {
		var q = pt.match(/<c:pt idx="(\d*)"[^<>\/]*><c:v>([^<]*)<\/c:v><\/c:pt>/);
		if(!q) return;
		col[+q[1]] = num ? +q[2] : q[2];
	});

	/* 21.2.2.71 formatCode CT_Xstring */
	var nf = unescapexml((str_match_xml(data, "c:formatCode") || ["","General"])[1]);

	(str_match_ng(data, "<c:f>", "</c:f>")||[]).forEach(function(F) { f = F.replace(/<[^<>]*>/g,""); });

	return [col, nf, f];
}

/* 21.2 DrawingML - Charts */
function parse_chart(data/*:?string*/, name/*:string*/, opts, rels, wb, csheet) {
	var cs/*:Worksheet*/ = ((csheet || {"!type":"chart"})/*:any*/);
	if(!data) return csheet;
	/* 21.2.2.27 chart CT_Chart */

	var C = 0, R = 0, col = "A";
	var refguess = {s: {r:2000000, c:2000000}, e: {r:0, c:0} };

	/* 21.2.2.120 numCache CT_NumData */
	(str_match_ng(data, "<c:numCache>", "</c:numCache>")||[]).forEach(function(nc) {
		var cache = parse_Cache(nc);
		refguess.s.r = refguess.s.c = 0;
		refguess.e.c = C;
		col = encode_col(C);
		cache[0].forEach(function(n,i) {
			if(cs["!data"]) {
				if(!cs["!data"][i]) cs["!data"][i] = [];
				cs["!data"][i][C] = {t:'n', v:n, z:cache[1] };
			} else cs[col + encode_row(i)] = {t:'n', v:n, z:cache[1] };
			R = i;
		});
		if(refguess.e.r < R) refguess.e.r = R;
		++C;
	});
	if(C > 0) cs["!ref"] = encode_range(refguess);
	return cs;
}
/* 18.3 Worksheets also covers Chartsheets */
function parse_cs_xml(data/*:?string*/, opts, idx/*:number*/, rels, wb/*::, themes, styles*/)/*:Worksheet*/ {
	if(!data) return data;
	/* 18.3.1.12 chartsheet CT_ChartSheet */
	if(!rels) rels = {'!id':{}};
	var s = ({'!type':"chart", '!drawel':null, '!rel':""}/*:any*/);
	var m;

	/* 18.3.1.83 sheetPr CT_ChartsheetPr */
	var sheetPr = data.match(sheetprregex);
	if(sheetPr) parse_ws_xml_sheetpr(sheetPr[0], s, wb, idx);

	/* 18.3.1.36 drawing CT_Drawing */
	if((m = data.match(/drawing r:id="(.*?)"/))) s['!rel'] = m[1];

	if(rels['!id'][s['!rel']]) s['!drawel'] = rels['!id'][s['!rel']];
	return s;
}
//function write_cs_xml(idx/*:number*/, opts, wb/*:Workbook*/, rels)/*:string*/ {
//	var o = [XML_HEADER, writextag('chartsheet', null, {
//		'xmlns': XMLNS_main[0],
//		'xmlns:r': XMLNS.r
//	})];
//	o[o.length] = writextag("drawing", null, {"r:id": "rId1"});
//	add_rels(rels, -1, "../drawings/drawing" + (idx+1) + ".xml", RELS.DRAW);
//	if(o.length>2) { o[o.length] = ('</chartsheet>'); o[1]=o[1].replace("/>",">"); }
//	return o.join("");
//}
/* 18.2.28 (CT_WorkbookProtection) Defaults */
var WBPropsDef = [
	['allowRefreshQuery',           false, "bool"],
	['autoCompressPictures',        true,  "bool"],
	['backupFile',                  false, "bool"],
	['checkCompatibility',          false, "bool"],
	['CodeName',                    ''],
	['date1904',                    false, "bool"],
	['defaultThemeVersion',         0,      "int"],
	['filterPrivacy',               false, "bool"],
	['hidePivotFieldList',          false, "bool"],
	['promptedSolutions',           false, "bool"],
	['publishItems',                false, "bool"],
	['refreshAllConnections',       false, "bool"],
	['saveExternalLinkValues',      true,  "bool"],
	['showBorderUnselectedTables',  true,  "bool"],
	['showInkAnnotation',           true,  "bool"],
	['showObjects',                 'all'],
	['showPivotChartFilter',        false, "bool"],
	['updateLinks', 'userSet']
];

/* 18.2.30 (CT_BookView) Defaults */
var WBViewDef = [
	['activeTab',                   0,      "int"],
	['autoFilterDateGrouping',      true,  "bool"],
	['firstSheet',                  0,      "int"],
	['minimized',                   false, "bool"],
	['showHorizontalScroll',        true,  "bool"],
	['showSheetTabs',               true,  "bool"],
	['showVerticalScroll',          true,  "bool"],
	['tabRatio',                    600,    "int"],
	['visibility',                  'visible']
	//window{Height,Width}, {x,y}Window
];

/* 18.2.19 (CT_Sheet) Defaults */
var SheetDef = [
	//['state', 'visible']
];

/* 18.2.2  (CT_CalcPr) Defaults */
var CalcPrDef = [
	['calcCompleted', 'true'],
	['calcMode', 'auto'],
	['calcOnSave', 'true'],
	['concurrentCalc', 'true'],
	['fullCalcOnLoad', 'false'],
	['fullPrecision', 'true'],
	['iterate', 'false'],
	['iterateCount', '100'],
	['iterateDelta', '0.001'],
	['refMode', 'A1']
];

/* 18.2.3 (CT_CustomWorkbookView) Defaults */
/*var CustomWBViewDef = [
	['autoUpdate', 'false'],
	['changesSavedWin', 'false'],
	['includeHiddenRowCol', 'true'],
	['includePrintSettings', 'true'],
	['maximized', 'false'],
	['minimized', 'false'],
	['onlySync', 'false'],
	['personalView', 'false'],
	['showComments', 'commIndicator'],
	['showFormulaBar', 'true'],
	['showHorizontalScroll', 'true'],
	['showObjects', 'all'],
	['showSheetTabs', 'true'],
	['showStatusbar', 'true'],
	['showVerticalScroll', 'true'],
	['tabRatio', '600'],
	['xWindow', '0'],
	['yWindow', '0']
];*/

function push_defaults_array(target, defaults) {
	for(var j = 0; j != target.length; ++j) { var w = target[j];
		for(var i=0; i != defaults.length; ++i) { var z = defaults[i];
			if(w[z[0]] == null) w[z[0]] = z[1];
			else switch(z[2]) {
			case "bool": if(typeof w[z[0]] == "string") w[z[0]] = parsexmlbool(w[z[0]]); break;
			case "int": if(typeof w[z[0]] == "string") w[z[0]] = parseInt(w[z[0]], 10); break;
			}
		}
	}
}
function push_defaults(target, defaults) {
	for(var i = 0; i != defaults.length; ++i) { var z = defaults[i];
		if(target[z[0]] == null) target[z[0]] = z[1];
		else switch(z[2]) {
			case "bool": if(typeof target[z[0]] == "string") target[z[0]] = parsexmlbool(target[z[0]]); break;
			case "int": if(typeof target[z[0]] == "string") target[z[0]] = parseInt(target[z[0]], 10); break;
		}
	}
}

function parse_wb_defaults(wb) {
	push_defaults(wb.WBProps, WBPropsDef);
	push_defaults(wb.CalcPr, CalcPrDef);

	push_defaults_array(wb.WBView, WBViewDef);
	push_defaults_array(wb.Sheets, SheetDef);

	_ssfopts.date1904 = parsexmlbool(wb.WBProps.date1904);
}

function safe1904(wb/*:Workbook*/)/*:string*/ {
	/* TODO: store date1904 somewhere else */
	if(!wb.Workbook) return "false";
	if(!wb.Workbook.WBProps) return "false";
	return parsexmlbool(wb.Workbook.WBProps.date1904) ? "true" : "false";
}

var badchars = /*#__PURE__*/":][*?\/\\".split("");
function check_ws_name(n/*:string*/, safe/*:?boolean*/)/*:boolean*/ {
	try {
		if(n == "") throw new Error("Sheet name cannot be blank");
		if(n.length > 31) throw new Error("Sheet name cannot exceed 31 chars");
		if(n.charCodeAt(0) == 0x27 || n.charCodeAt(n.length - 1) == 0x27) throw new Error("Sheet name cannot start or end with apostrophe (')");
		if(n.toLowerCase() == "history") throw new Error("Sheet name cannot be 'History'");
		badchars.forEach(function(c) {
			if(n.indexOf(c) == -1) return;
			throw new Error("Sheet name cannot contain : \\ / ? * [ ]");
		});
	} catch(e) { if(safe) return false; throw e; }
	return true;
}
function check_wb_names(N, S, codes) {
	N.forEach(function(n,i) {
		check_ws_name(n);
		for(var j = 0; j < i; ++j) if(n == N[j]) throw new Error("Duplicate Sheet Name: " + n);
		if(codes) {
			var cn = (S && S[i] && S[i].CodeName) || n;
			if(cn.charCodeAt(0) == 95 && cn.length > 22) throw new Error("Bad Code Name: Worksheet" + cn);
		}
	});
}
function check_wb(wb) {
	if(!wb || !wb.SheetNames || !wb.Sheets) throw new Error("Invalid Workbook");
	if(!wb.SheetNames.length) throw new Error("Workbook is empty");
	var Sheets = (wb.Workbook && wb.Workbook.Sheets) || [];
	check_wb_names(wb.SheetNames, Sheets, !!wb.vbaraw);
	for(var i = 0; i < wb.SheetNames.length; ++i) check_ws(wb.Sheets[wb.SheetNames[i]], wb.SheetNames[i], i);
	wb.SheetNames.forEach(function(n, i) {
		var ws = wb.Sheets[n];
		if(!ws || !ws["!autofilter"]) return;
		var DN;
		if(!wb.Workbook) wb.Workbook = {};
		if(!wb.Workbook.Names) wb.Workbook.Names = [];
		wb.Workbook.Names.forEach(function(dn) { if(dn.Name == "_xlnm._FilterDatabase" && dn.Sheet == i) DN = dn; });
		var nn = formula_quote_sheet_name(n) + "!" + fix_range(ws["!autofilter"].ref);
		if(DN) DN.Ref = nn;
		else wb.Workbook.Names.push({Name: "_xlnm._FilterDatabase", Sheet: i, Ref: nn});
	});
	/* TODO: validate workbook */
}
/* 18.2 Workbook */
var wbnsregex = /<\w+:workbook/;
function parse_wb_xml(data, opts)/*:WorkbookFile*/ {
	if(!data) throw new Error("Could not find file");
	var wb = /*::(*/{ AppVersion:{}, WBProps:{}, WBView:[], Sheets:[], CalcPr:{}, Names:[], xmlns: "" }/*::)*/;
	var pass = false, xmlns = "xmlns";
	var dname = {}, dnstart = 0;
	data.replace(tagregex, function xml_wb(x, idx) {
		var y/*:any*/ = parsexmltag(x);
		switch(strip_ns(y[0])) {
			case '<?xml': break;

			/* 18.2.27 workbook CT_Workbook 1 */
			case '<workbook':
				if(x.match(wbnsregex)) xmlns = "xmlns" + x.match(/<(\w+):/)[1];
				wb.xmlns = y[xmlns];
				break;
			case '</workbook>': break;

			/* 18.2.13 fileVersion CT_FileVersion ? */
			case '<fileVersion': delete y[0]; wb.AppVersion = y; break;
			case '<fileVersion/>': case '</fileVersion>': break;

			/* 18.2.12 fileSharing CT_FileSharing ? */
			case '<fileSharing':
				break;
			case '<fileSharing/>': break;

			/* 18.2.28 workbookPr CT_WorkbookPr ? */
			case '<workbookPr':
			case '<workbookPr/>':
				WBPropsDef.forEach(function(w) {
					if(y[w[0]] == null) return;
					switch(w[2]) {
						case "bool": wb.WBProps[w[0]] = parsexmlbool(y[w[0]]); break;
						case "int": wb.WBProps[w[0]] = parseInt(y[w[0]], 10); break;
						default: wb.WBProps[w[0]] = y[w[0]];
					}
				});
				if(y.codeName) wb.WBProps.CodeName = utf8read(y.codeName);
				break;
			case '</workbookPr>': break;

			/* 18.2.29 workbookProtection CT_WorkbookProtection ? */
			case '<workbookProtection':
				break;
			case '<workbookProtection/>': break;

			/* 18.2.1  bookViews CT_BookViews ? */
			case '<bookViews': case '<bookViews>': case '</bookViews>': break;
			/* 18.2.30   workbookView CT_BookView + */
			case '<workbookView': case '<workbookView/>': delete y[0]; wb.WBView.push(y); break;
			case '</workbookView>': break;

			/* 18.2.20 sheets CT_Sheets 1 */
			case '<sheets': case '<sheets>': case '</sheets>': break; // aggregate sheet
			/* 18.2.19   sheet CT_Sheet + */
			case '<sheet':
				switch(y.state) {
					case "hidden": y.Hidden = 1; break;
					case "veryHidden": y.Hidden = 2; break;
					default: y.Hidden = 0;
				}
				delete y.state;
				y.name = unescapexml(utf8read(y.name));
				delete y[0]; wb.Sheets.push(y); break;
			case '</sheet>': break;

			/* 18.2.15 functionGroups CT_FunctionGroups ? */
			case '<functionGroups': case '<functionGroups/>': break;
			/* 18.2.14   functionGroup CT_FunctionGroup + */
			case '<functionGroup': break;

			/* 18.2.9  externalReferences CT_ExternalReferences ? */
			case '<externalReferences': case '</externalReferences>': case '<externalReferences>': break;
			/* 18.2.8    externalReference CT_ExternalReference + */
			case '<externalReference': break;

			/* 18.2.6  definedNames CT_DefinedNames ? */
			case '<definedNames/>': break;
			case '<definedNames>': case '<definedNames': pass=true; break;
			case '</definedNames>': pass=false; break;
			/* 18.2.5    definedName CT_DefinedName + */
			case '<definedName': {
				dname = {};
				dname.Name = utf8read(y.name);
				if(y.comment) dname.Comment = y.comment;
				if(y.localSheetId) dname.Sheet = +y.localSheetId;
				if(parsexmlbool(y.hidden||"0")) dname.Hidden = true;
				dnstart = idx + x.length;
			}	break;
			case '</definedName>': {
				dname.Ref = unescapexml(utf8read(data.slice(dnstart, idx)));
				wb.Names.push(dname);
			} break;
			case '<definedName/>': break;

			/* 18.2.2  calcPr CT_CalcPr ? */
			case '<calcPr': delete y[0]; wb.CalcPr = y; break;
			case '<calcPr/>': delete y[0]; wb.CalcPr = y; break;
			case '</calcPr>': break;

			/* 18.2.16 oleSize CT_OleSize ? (ref required) */
			case '<oleSize': break;

			/* 18.2.4  customWorkbookViews CT_CustomWorkbookViews ? */
			case '<customWorkbookViews>': case '</customWorkbookViews>': case '<customWorkbookViews': break;
			/* 18.2.3  customWorkbookView CT_CustomWorkbookView + */
			case '<customWorkbookView': case '</customWorkbookView>': break;

			/* 18.2.18 pivotCaches CT_PivotCaches ? */
			case '<pivotCaches>': case '</pivotCaches>': case '<pivotCaches': break;
			/* 18.2.17 pivotCache CT_PivotCache ? */
			case '<pivotCache': break;

			/* 18.2.21 smartTagPr CT_SmartTagPr ? */
			case '<smartTagPr': case '<smartTagPr/>': break;

			/* 18.2.23 smartTagTypes CT_SmartTagTypes ? */
			case '<smartTagTypes': case '<smartTagTypes>': case '</smartTagTypes>': break;
			/* 18.2.22 smartTagType CT_SmartTagType ? */
			case '<smartTagType': break;

			/* 18.2.24 webPublishing CT_WebPublishing ? */
			case '<webPublishing': case '<webPublishing/>': break;

			/* 18.2.11 fileRecoveryPr CT_FileRecoveryPr ? */
			case '<fileRecoveryPr': case '<fileRecoveryPr/>': break;

			/* 18.2.26 webPublishObjects CT_WebPublishObjects ? */
			case '<webPublishObjects>': case '<webPublishObjects': case '</webPublishObjects>': break;
			/* 18.2.25 webPublishObject CT_WebPublishObject ? */
			case '<webPublishObject': break;

			/* 18.2.10 extLst CT_ExtensionList ? */
			case '<extLst': case '<extLst>': case '</extLst>': case '<extLst/>': break;
			/* 18.2.7  ext CT_Extension + */
			case '<ext': pass=true; break; //TODO: check with versions of excel
			case '</ext>': pass=false; break;

			/* Others */
			case '<ArchID': break;
			case '<AlternateContent':
			case '<AlternateContent>': pass=true; break;
			case '</AlternateContent>': pass=false; break;

			/* TODO */
			case '<revisionPtr': break;

			default: if(!pass && opts.WTF) throw new Error('unrecognized ' + y[0] + ' in workbook');
		}
		return x;
	});
	if(XMLNS_main.indexOf(wb.xmlns) === -1) throw new Error("Unknown Namespace: " + wb.xmlns);

	parse_wb_defaults(wb);

	return wb;
}

function write_wb_xml(wb/*:Workbook*//*::, opts:?WriteOpts*/)/*:string*/ {
	var o = [XML_HEADER];
	o[o.length] = writextag('workbook', null, {
		'xmlns': XMLNS_main[0],
		//'xmlns:mx': XMLNS.mx,
		//'xmlns:s': XMLNS_main[0],
		'xmlns:r': XMLNS.r
	});

	var write_names = (wb.Workbook && (wb.Workbook.Names||[]).length > 0);

	/* fileVersion */
	/* fileSharing */

	var workbookPr/*:any*/ = ({codeName:"ThisWorkbook"}/*:any*/);
	if(wb.Workbook && wb.Workbook.WBProps) {
		WBPropsDef.forEach(function(x) {
			/*:: if(!wb.Workbook || !wb.Workbook.WBProps) throw "unreachable"; */
			if((wb.Workbook.WBProps[x[0]]/*:any*/) == null) return;
			if((wb.Workbook.WBProps[x[0]]/*:any*/) == x[1]) return;
			workbookPr[x[0]] = (wb.Workbook.WBProps[x[0]]/*:any*/);
		});
		/*:: if(!wb.Workbook || !wb.Workbook.WBProps) throw "unreachable"; */
		if(wb.Workbook.WBProps.CodeName) { workbookPr.codeName = wb.Workbook.WBProps.CodeName; delete workbookPr.CodeName; }
	}
	o[o.length] = (writextag('workbookPr', null, workbookPr));

	/* workbookProtection */

	var sheets = wb.Workbook && wb.Workbook.Sheets || [];
	var i = 0;

	/* bookViews only written if first worksheet is hidden */
	if(sheets && sheets[0] && !!sheets[0].Hidden) {
		o[o.length] = "<bookViews>";
		for(i = 0; i != wb.SheetNames.length; ++i) {
			if(!sheets[i]) break;
			if(!sheets[i].Hidden) break;
		}
		if(i == wb.SheetNames.length) i = 0;
		o[o.length] = '<workbookView firstSheet="' + i + '" activeTab="' + i + '"/>';
		o[o.length] = "</bookViews>";
	}

	o[o.length] = "<sheets>";
	for(i = 0; i != wb.SheetNames.length; ++i) {
		var sht = ({name:escapexml(wb.SheetNames[i].slice(0,31))}/*:any*/);
		sht.sheetId = ""+(i+1);
		sht["r:id"] = "rId"+(i+1);
		if(sheets[i]) switch(sheets[i].Hidden) {
			case 1: sht.state = "hidden"; break;
			case 2: sht.state = "veryHidden"; break;
		}
		o[o.length] = (writextag('sheet',null,sht));
	}
	o[o.length] = "</sheets>";

	/* functionGroups */
	/* externalReferences */

	if(write_names) {
		o[o.length] = "<definedNames>";
		if(wb.Workbook && wb.Workbook.Names) wb.Workbook.Names.forEach(function(n) {
			var d/*:any*/ = {name:n.Name};
			if(n.Comment) d.comment = n.Comment;
			if(n.Sheet != null) d.localSheetId = ""+n.Sheet;
			if(n.Hidden) d.hidden = "1";
			if(!n.Ref) return;
			o[o.length] = writextag('definedName', escapexml(n.Ref), d);
		});
		o[o.length] = "</definedNames>";
	}

	/* calcPr */
	/* oleSize */
	/* customWorkbookViews */
	/* pivotCaches */
	/* smartTagPr */
	/* smartTagTypes */
	/* webPublishing */
	/* fileRecoveryPr */
	/* webPublishObjects */
	/* extLst */

	if(o.length>2){ o[o.length] = '</workbook>'; o[1]=o[1].replace("/>",">"); }
	return o.join("");
}
function parse_wb(data, name/*:string*/, opts)/*:WorkbookFile*/ {
	if(name.slice(-4)===".bin") return parse_wb_bin((data/*:any*/), opts);
	return parse_wb_xml((data/*:any*/), opts);
}

function parse_ws(data, name/*:string*/, idx/*:number*/, opts, rels, wb, themes, styles)/*:Worksheet*/ {
	if(name.slice(-4)===".bin") return parse_ws_bin((data/*:any*/), opts, idx, rels, wb, themes, styles);
	return parse_ws_xml((data/*:any*/), opts, idx, rels, wb, themes, styles);
}

function parse_cs(data, name/*:string*/, idx/*:number*/, opts, rels, wb, themes, styles)/*:Worksheet*/ {
	if(name.slice(-4)===".bin") return parse_cs_bin((data/*:any*/), opts, idx, rels, wb, themes, styles);
	return parse_cs_xml((data/*:any*/), opts, idx, rels, wb, themes, styles);
}

function parse_ms(data, name/*:string*/, idx/*:number*/, opts, rels, wb, themes, styles)/*:Worksheet*/ {
	if(name.slice(-4)===".bin") return parse_ms_bin((data/*:any*/), opts, idx, rels, wb, themes, styles);
	return parse_ms_xml((data/*:any*/), opts, idx, rels, wb, themes, styles);
}

function parse_ds(data, name/*:string*/, idx/*:number*/, opts, rels, wb, themes, styles)/*:Worksheet*/ {
	if(name.slice(-4)===".bin") return parse_ds_bin((data/*:any*/), opts, idx, rels, wb, themes, styles);
	return parse_ds_xml((data/*:any*/), opts, idx, rels, wb, themes, styles);
}

function parse_sty(data, name/*:string*/, themes, opts) {
	if(name.slice(-4)===".bin") return parse_sty_bin((data/*:any*/), themes, opts);
	return parse_sty_xml((data/*:any*/), themes, opts);
}

function parse_sst(data, name/*:string*/, opts)/*:SST*/ {
	if(name.slice(-4)===".bin") return parse_sst_bin((data/*:any*/), opts);
	return parse_sst_xml((data/*:any*/), opts);
}

function parse_cmnt(data, name/*:string*/, opts)/*:Array<RawComment>*/ {
	if(name.slice(-4)===".bin") return parse_comments_bin((data/*:any*/), opts);
	return parse_comments_xml((data/*:any*/), opts);
}

function parse_cc(data, name/*:string*/, opts) {
	if(name.slice(-4)===".bin") return parse_cc_bin((data/*:any*/), name, opts);
	return parse_cc_xml((data/*:any*/), name, opts);
}

function parse_xlink(data, rel, name/*:string*/, opts) {
	if(name.slice(-4)===".bin") return parse_xlink_bin((data/*:any*/), rel, name, opts);
	return parse_xlink_xml((data/*:any*/), rel, name, opts);
}

function parse_xlmeta(data, name/*:string*/, opts) {
	if(name.slice(-4)===".bin") return parse_xlmeta_bin((data/*:any*/), name, opts);
	return parse_xlmeta_xml((data/*:any*/), name, opts);
}
/* note: browser DOM element cannot see mso- style attrs, must parse */
function html_to_sheet(str/*:string*/, _opts)/*:Workbook*/ {
	var opts = _opts || {};
	var dense = (opts.dense != null) ? opts.dense : DENSE;
	var ws/*:Worksheet*/ = ({}/*:any*/); if(dense) ws["!data"] = [];
	str = str_remove_ng(str, "<!--", "-->");
	var mtch/*:any*/ = str.match(/<table/i);
	if(!mtch) throw new Error("Invalid HTML: could not find <table>");
	var mtch2/*:any*/ = str.match(/<\/table/i);
	var i/*:number*/ = mtch.index, j/*:number*/ = mtch2 && mtch2.index || str.length;
	var rows = split_regex(str.slice(i, j), /(:?<tr[^<>]*>)/i, "<tr>");
	var R = -1, C = 0, RS = 0, CS = 0;
	var range/*:Range*/ = {s:{r:10000000, c:10000000},e:{r:0,c:0}};
	var merges/*:Array<Range>*/ = [];
	for(i = 0; i < rows.length; ++i) {
		var row = rows[i].trim();
		var hd = row.slice(0,3).toLowerCase();
		if(hd == "<tr") { ++R; if(opts.sheetRows && opts.sheetRows <= R) { --R; break; } C = 0; continue; }
		if(hd != "<td" && hd != "<th") continue;
		var cells = row.split(/<\/t[dh]>/i);
		for(j = 0; j < cells.length; ++j) {
			var cell = cells[j].trim();
			if(!cell.match(/<t[dh]/i)) continue;
			var m = cell, cc = 0;
			/* TODO: parse styles etc */
			while(m.charAt(0) == "<" && (cc = m.indexOf(">")) > -1) m = m.slice(cc+1);
			for(var midx = 0; midx < merges.length; ++midx) {
				var _merge/*:Range*/ = merges[midx];
				if(_merge.s.c == C && _merge.s.r < R && R <= _merge.e.r) { C = _merge.e.c + 1; midx = -1; }
			}
			var tag = parsexmltag(cell.slice(0, cell.indexOf(">")));
			CS = tag.colspan ? +tag.colspan : 1;
			if((RS = +tag.rowspan)>1 || CS>1) merges.push({s:{r:R,c:C},e:{r:R + (RS||1) - 1, c:C + CS - 1}});
			var _t/*:string*/ = tag.t || tag["data-t"] || "";
			/* TODO: generate stub cells */
			if(!m.length) { C += CS; continue; }
			m = htmldecode(m);
			if(range.s.r > R) range.s.r = R; if(range.e.r < R) range.e.r = R;
			if(range.s.c > C) range.s.c = C; if(range.e.c < C) range.e.c = C;
			if(!m.length) { C += CS; continue; }
			var o/*:Cell*/ = {t:'s', v:m};
			if(opts.raw || !m.trim().length || _t == 's'){}
			else if(m === 'TRUE') o = {t:'b', v:true};
			else if(m === 'FALSE') o = {t:'b', v:false};
			else if(!isNaN(fuzzynum(m))) o = {t:'n', v:fuzzynum(m)};
			else if(!isNaN(fuzzydate(m).getDate())) {
				o = ({t:'d', v:parseDate(m)}/*:any*/);
				if(opts.UTC === false) o.v = utc_to_local(o.v);
				if(!opts.cellDates) o = ({t:'n', v:datenum(o.v)}/*:any*/);
				o.z = opts.dateNF || table_fmt[14];
			}
			if(o.cellText !== false) o.w = m;
			if(dense) { if(!ws["!data"][R]) ws["!data"][R] = []; ws["!data"][R][C] = o; }
			else ws[encode_cell({r:R, c:C})] = o;
			C += CS;
		}
	}
	ws['!ref'] = encode_range(range);
	if(merges.length) ws["!merges"] = merges;
	return ws;
}
function make_html_row(ws/*:Worksheet*/, r/*:Range*/, R/*:number*/, o/*:Sheet2HTMLOpts*/)/*:string*/ {
	var M/*:Array<Range>*/ = (ws['!merges'] ||[]);
	var oo/*:Array<string>*/ = [];
	var sp = ({}/*:any*/);
	var dense = ws["!data"] != null;
	for(var C = r.s.c; C <= r.e.c; ++C) {
		var RS = 0, CS = 0;
		for(var j = 0; j < M.length; ++j) {
			if(M[j].s.r > R || M[j].s.c > C) continue;
			if(M[j].e.r < R || M[j].e.c < C) continue;
			if(M[j].s.r < R || M[j].s.c < C) { RS = -1; break; }
			RS = M[j].e.r - M[j].s.r + 1; CS = M[j].e.c - M[j].s.c + 1; break;
		}
		if(RS < 0) continue;
		var coord = encode_col(C) + encode_row(R);
		var cell = dense ? (ws["!data"][R]||[])[C] : ws[coord];
		/* TODO: html entities */
		var w = (cell && cell.v != null) && (cell.h || escapehtml(cell.w || (format_cell(cell), cell.w) || "")) || "";
		sp = ({}/*:any*/);
		if(RS > 1) sp.rowspan = RS;
		if(CS > 1) sp.colspan = CS;
		if(o.editable) w = '<span contenteditable="true">' + w + '</span>';
		else if(cell) {
			sp["data-t"] = cell && cell.t || 'z';
			// note: data-v is unaffected by the timezone interpretation
			if(cell.v != null) sp["data-v"] = escapehtml(cell.v instanceof Date ? cell.v.toISOString() : cell.v);
			if(cell.z != null) sp["data-z"] = cell.z;
			if(cell.l && (cell.l.Target || "#").charAt(0) != "#") w = '<a href="' + escapehtml(cell.l.Target) +'">' + w + '</a>';
		}
		sp.id = (o.id || "sjs") + "-" + coord;
		oo.push(writextag('td', w, sp));
	}
	var preamble = "<tr>";
	return preamble + oo.join("") + "</tr>";
}

var HTML_BEGIN = '<html><head><meta charset="utf-8"/><title>SheetJS Table Export</title></head><body>';
var HTML_END = '</body></html>';

function html_to_workbook(str/*:string*/, opts)/*:Workbook*/ {
	var mtch = str_match_xml_ig(str, "table");
	if(!mtch || mtch.length == 0) throw new Error("Invalid HTML: could not find <table>");
	if(mtch.length == 1) {
		var w = sheet_to_workbook(html_to_sheet(mtch[0], opts), opts);
		w.bookType = "html";
		return w;
	}
	var wb = book_new();
	mtch.forEach(function(s, idx) { book_append_sheet(wb, html_to_sheet(s, opts), "Sheet" + (idx+1)); });
	wb.bookType = "html";
	return wb;
}

function make_html_preamble(ws/*:Worksheet*/, R/*:Range*/, o/*:Sheet2HTMLOpts*/)/*:string*/ {
	var out/*:Array<string>*/ = [];
	return out.join("") + '<table' + (o && o.id ? ' id="' + o.id + '"' : "") + '>';
}

function sheet_to_html(ws/*:Worksheet*/, opts/*:?Sheet2HTMLOpts*//*, wb:?Workbook*/)/*:string*/ {
	var o = opts || {};
	var header = o.header != null ? o.header : HTML_BEGIN;
	var footer = o.footer != null ? o.footer : HTML_END;
	var out/*:Array<string>*/ = [header];
	var r = decode_range(ws['!ref'] || "A1");
	out.push(make_html_preamble(ws, r, o));
	if(ws["!ref"]) for(var R = r.s.r; R <= r.e.r; ++R) out.push(make_html_row(ws, r, R, o));
	out.push("</table>" + footer);
	return out.join("");
}

function sheet_add_dom(ws/*:Worksheet*/, table/*:HTMLElement*/, _opts/*:?any*/)/*:Worksheet*/ {
	var rows/*:HTMLCollection<HTMLTableRowElement>*/ = table.rows;
	if(!rows) {
		/* not an HTML TABLE */
		throw "Unsupported origin when " + table.tagName + " is not a TABLE";
	}

	var opts = _opts || {};
	var dense = ws["!data"] != null;
	var or_R = 0, or_C = 0;
	if(opts.origin != null) {
		if(typeof opts.origin == 'number') or_R = opts.origin;
		else {
			var _origin/*:CellAddress*/ = typeof opts.origin == "string" ? decode_cell(opts.origin) : opts.origin;
			or_R = _origin.r; or_C = _origin.c;
		}
	}

	var sheetRows = Math.min(opts.sheetRows||10000000, rows.length);
	var range/*:Range*/ = {s:{r:0,c:0},e:{r:or_R,c:or_C}};
	if(ws["!ref"]) {
		var _range/*:Range*/ = decode_range(ws["!ref"]);
		range.s.r = Math.min(range.s.r, _range.s.r);
		range.s.c = Math.min(range.s.c, _range.s.c);
		range.e.r = Math.max(range.e.r, _range.e.r);
		range.e.c = Math.max(range.e.c, _range.e.c);
		if(or_R == -1) range.e.r = or_R = _range.e.r + 1;
	}
	var merges/*:Array<Range>*/ = [], midx = 0;
	var rowinfo/*:Array<RowInfo>*/ = ws["!rows"] || (ws["!rows"] = []);
	var _R = 0, R = 0, _C = 0, C = 0, RS = 0, CS = 0;
	if(!ws["!cols"]) ws['!cols'] = [];
	for(; _R < rows.length && R < sheetRows; ++_R) {
		var row/*:HTMLTableRowElement*/ = rows[_R];
		if (is_dom_element_hidden(row)) {
			if (opts.display) continue;
			rowinfo[R] = {hidden: true};
		}
		var elts/*:HTMLCollection<HTMLTableCellElement>*/ = (row.cells);
		for(_C = C = 0; _C < elts.length; ++_C) {
			var elt/*:HTMLTableCellElement*/ = elts[_C];
			if (opts.display && is_dom_element_hidden(elt)) continue;
			var v/*:?string*/ = elt.hasAttribute('data-v') ? elt.getAttribute('data-v') : elt.hasAttribute('v') ? elt.getAttribute('v') : htmldecode(elt.innerHTML);
			var z/*:?string*/ = elt.getAttribute('data-z') || elt.getAttribute('z');
			for(midx = 0; midx < merges.length; ++midx) {
				var m/*:Range*/ = merges[midx];
				if(m.s.c == C + or_C && m.s.r < R + or_R && R + or_R <= m.e.r) { C = m.e.c+1 - or_C; midx = -1; }
			}
			/* TODO: figure out how to extract nonstandard mso- style */
			CS = +elt.getAttribute("colspan") || 1;
			if( ((RS = (+elt.getAttribute("rowspan") || 1)))>1 || CS>1) merges.push({s:{r:R + or_R,c:C + or_C},e:{r:R + or_R + (RS||1) - 1, c:C + or_C + (CS||1) - 1}});
			var o/*:Cell*/ = {t:'s', v:v};
			var _t/*:string*/ = elt.getAttribute("data-t") || elt.getAttribute("t") || "";
			if(v != null) {
				if(v.length == 0) o.t = _t || 'z';
				else if(opts.raw || v.trim().length == 0 || _t == "s"){}
				else if(v === 'TRUE') o = {t:'b', v:true};
				else if(v === 'FALSE') o = {t:'b', v:false};
				else if(!isNaN(fuzzynum(v))) o = {t:'n', v:fuzzynum(v)};
				else if(!isNaN(fuzzydate(v).getDate())) {
					o = ({t:'d', v:parseDate(v)}/*:any*/);
					if(opts.UTC) o.v = local_to_utc(o.v);
					if(!opts.cellDates) o = ({t:'n', v:datenum(o.v)}/*:any*/);
					o.z = opts.dateNF || table_fmt[14];
				}
			}
			if(o.z === undefined && z != null) o.z = z;
			/* The first link is used.  Links are assumed to be fully specified.
			 * TODO: The right way to process relative links is to make a new <a> */
			var l = "", Aelts = elt.getElementsByTagName("A");
			if(Aelts && Aelts.length) for(var Aelti = 0; Aelti < Aelts.length; ++Aelti)	if(Aelts[Aelti].hasAttribute("href")) {
				l = Aelts[Aelti].getAttribute("href"); if(l.charAt(0) != "#") break;
			}
			if(l && l.charAt(0) != "#" &&	l.slice(0, 11).toLowerCase() != 'javascript:') o.l = ({ Target: l });
			if(dense) { if(!ws["!data"][R + or_R]) ws["!data"][R + or_R] = []; ws["!data"][R + or_R][C + or_C] = o; }
			else ws[encode_cell({c:C + or_C, r:R + or_R})] = o;
			if(range.e.c < C + or_C) range.e.c = C + or_C;
			C += CS;
		}
		++R;
	}
	if(merges.length) ws['!merges'] = (ws["!merges"] || []).concat(merges);
	range.e.r = Math.max(range.e.r, R - 1 + or_R);
	ws['!ref'] = encode_range(range);
	if(R >= sheetRows) ws['!fullref'] = encode_range((range.e.r = rows.length-_R+R-1 + or_R,range)); // We can count the real number of rows to parse but we don't to improve the performance
	return ws;
}

function parse_dom_table(table/*:HTMLElement*/, _opts/*:?any*/)/*:Worksheet*/ {
	var opts = _opts || {};
	var ws/*:Worksheet*/ = ({}/*:any*/); if(opts.dense) ws["!data"] = [];
	return sheet_add_dom(ws, table, _opts);
}

function table_to_book(table/*:HTMLElement*/, opts/*:?any*/)/*:Workbook*/ {
	var o = sheet_to_workbook(parse_dom_table(table, opts), opts);
	//o.bookType = "dom"; // TODO: define a type for this
	return o;
}

function is_dom_element_hidden(element/*:HTMLElement*/)/*:boolean*/ {
	var display/*:string*/ = '';
	var get_computed_style/*:?function*/ = get_get_computed_style_function(element);
	if(get_computed_style) display = get_computed_style(element).getPropertyValue('display');
	if(!display) display = element.style && element.style.display;
	return display === 'none';
}

/* global getComputedStyle */
function get_get_computed_style_function(element/*:HTMLElement*/)/*:?function*/ {
	// The proper getComputedStyle implementation is the one defined in the element window
	if(element.ownerDocument.defaultView && typeof element.ownerDocument.defaultView.getComputedStyle === 'function') return element.ownerDocument.defaultView.getComputedStyle;
	// If it is not available, try to get one from the global namespace
	if(typeof getComputedStyle === 'function') return getComputedStyle;
	return null;
}
/* OpenDocument */
function parse_text_p(text/*:string*//*::, tag*/)/*:Array<any>*/ {
	/* 6.1.2 White Space Characters */
	var fixed = text
		.replace(/[\t\r\n]/g, " ").trim().replace(/ +/g, " ")
		.replace(/<text:s\/>/g," ")
		.replace(/<text:s text:c="(\d+)"\/>/g, function($$,$1) { return Array(parseInt($1,10)+1).join(" "); })
		.replace(/<text:tab[^<>]*\/>/g,"\t")
		.replace(/<text:line-break\/>/g,"\n");
	var v = unescapexml(fixed.replace(/<[^<>]*>/g,""));

	return [v];
}

/* Note: ODS can stick styles in content.xml or styles.xml, FODS blurs lines */
function parse_ods_styles(d/*:string*/, _opts, _nfm) {
	var number_format_map = _nfm || {};
	var str = xlml_normalize(d);
	xlmlregex.lastIndex = 0;
	str = remove_doctype(str_remove_ng(str, "<!--", "-->"));
	var Rn, NFtag, NF = "", tNF = "", y, etpos = 0, tidx = -1, infmt = false, payload = "";
	while((Rn = xlmlregex.exec(str))) {
		switch((Rn[3]=Rn[3].replace(/_[\s\S]*$/,""))) {
		/* Number Format Definitions */
		case 'number-style': // <number:number-style> 16.29.2
		case 'currency-style': // <number:currency-style> 16.29.8
		case 'percentage-style': // <number:percentage-style> 16.29.10
		case 'date-style': // <number:date-style> 16.29.11
		case 'time-style': // <number:time-style> 16.29.19
		case 'text-style': // <number:text-style> 16.29.26
			if(Rn[1]==='/') {
				infmt = false;
				if(NFtag['truncate-on-overflow'] == "false") {
					if(NF.match(/h/)) NF = NF.replace(/h+/, "[$&]");
					else if(NF.match(/m/)) NF = NF.replace(/m+/, "[$&]");
					else if(NF.match(/s/)) NF = NF.replace(/s+/, "[$&]");
				}
				number_format_map[NFtag.name] = NF;
				NF = "";
			} else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
				infmt = true;
				NF = "";
				NFtag = parsexmltag(Rn[0], false);
			} break;

		// LibreOffice bug https://bugs.documentfoundation.org/show_bug.cgi?id=149484
		case 'boolean-style': // <number:boolean-style> 16.29.24
			if(Rn[1]==='/') {
				infmt = false;
				number_format_map[NFtag.name] = "General";
				NF = "";
			} else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
				infmt = true;
				NF = "";
				NFtag = parsexmltag(Rn[0], false);
			} break;

		/* Number Format Elements */
		case 'boolean': // <number:boolean> 16.29.25
			NF += "General"; // ODF spec is unfortunately underspecified here
			break;

		case 'text': // <number:text> 16.29.27
			if(Rn[1]==='/') {
				payload = str.slice(tidx, xlmlregex.lastIndex - Rn[0].length);
				// NOTE: Excel has a different interpretation of "%%" and friends
				if(payload == "%" && NFtag[0] == '<number:percentage-style') NF += "%";
				else NF += '"' + payload.replace(/"/g, '""') + '"';
			} else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
				tidx = xlmlregex.lastIndex;
			} break;


		case 'day': { // <number:day> 16.29.12
			y = parsexmltag(Rn[0], false);
			switch(y["style"]) {
				case "short": NF += "d"; break;
				case "long": NF += "dd"; break;
				default: NF += "dd"; break; // TODO: error condition
			}
		} break;

		case 'day-of-week': { // <number:day-of-week> 16.29.16
			y = parsexmltag(Rn[0], false);
			switch(y["style"]) {
				case "short": NF += "ddd"; break;
				case "long": NF += "dddd"; break;
				default: NF += "ddd"; break;
			}
		} break;

		case 'era': { // <number:era> 16.29.15 TODO: proper mapping
			y = parsexmltag(Rn[0], false);
			switch(y["style"]) {
				case "short": NF += "ee"; break;
				case "long": NF += "eeee"; break;
				default: NF += "eeee"; break; // TODO: error condition
			}
		} break;

		case 'hours': { // <number:hours> 16.29.20
			y = parsexmltag(Rn[0], false);
			switch(y["style"]) {
				case "short": NF += "h"; break;
				case "long": NF += "hh"; break;
				default: NF += "hh"; break; // TODO: error condition
			}
		} break;

		case 'minutes': { // <number:minutes> 16.29.21
			y = parsexmltag(Rn[0], false);
			switch(y["style"]) {
				case "short": NF += "m"; break;
				case "long": NF += "mm"; break;
				default: NF += "mm"; break; // TODO: error condition
			}
		} break;

		case 'month': { // <number:month> 16.29.13
			y = parsexmltag(Rn[0], false);
			if(y["textual"]) NF += "mm";
			switch(y["style"]) {
				case "short": NF += "m"; break;
				case "long": NF += "mm"; break;
				default: NF += "m"; break;
			}
		} break;

		case 'seconds': { // <number:seconds> 16.29.22
			y = parsexmltag(Rn[0], false);
			switch(y["style"]) {
				case "short": NF += "s"; break;
				case "long": NF += "ss"; break;
				default: NF += "ss"; break; // TODO: error condition
			}
			if(y["decimal-places"]) NF += "." + fill("0", +y["decimal-places"]);
		} break;

		case 'year': { // <number:year> 16.29.14
			y = parsexmltag(Rn[0], false);
			switch(y["style"]) {
				case "short": NF += "yy"; break;
				case "long": NF += "yyyy"; break;
				default: NF += "yy"; break; // TODO: error condition
			}
		} break;

		case 'am-pm': // <number:am-pm> 16.29.23
			NF += "AM/PM"; // LO autocorrects A/P -> AM/PM
			break;

		case 'week-of-year': // <number:week-of-year> 16.29.17
		case 'quarter': // <number:quarter> 16.29.18
			console.error("Excel does not support ODS format token " + Rn[3]);
			break;

		case 'fill-character': // <number:fill-character> 16.29.5
			if(Rn[1]==='/') {
				payload = str.slice(tidx, xlmlregex.lastIndex - Rn[0].length);
				// NOTE: Excel has a different interpretation of "%%" and friends
				NF += '"' + payload.replace(/"/g, '""') + '"*';
			} else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
				tidx = xlmlregex.lastIndex;
			} break;

		case 'scientific-number': // <number:scientific-number> 16.29.6
			// TODO: find a mapping for all parameters
			y = parsexmltag(Rn[0], false);
			NF += "0." + fill("0", +y["min-decimal-places"] || +y["decimal-places"] || 2) + fill("?", +y["decimal-places"] - +y["min-decimal-places"] || 0) + "E" + (parsexmlbool(y["forced-exponent-sign"]) ? "+" : "") + fill("0", +y["min-exponent-digits"] || 2);
			break;

		case 'fraction': // <number:fraction> 16.29.7
			// TODO: find a mapping for all parameters
			y = parsexmltag(Rn[0], false);
			if(!+y["min-integer-digits"]) NF += "#";
			else NF += fill("0", +y["min-integer-digits"]);
			NF += " ";
			NF += fill("?", +y["min-numerator-digits"] || 1);
			NF += "/";
			if(+y["denominator-value"]) NF += y["denominator-value"];
			else NF += fill("?", +y["min-denominator-digits"] || 1);
			break;

		case 'currency-symbol': // <number:currency-symbol> 16.29.9
			// TODO: localization with [$-...]
			if(Rn[1]==='/') {
				NF += '"' + str.slice(tidx, xlmlregex.lastIndex - Rn[0].length).replace(/"/g, '""') + '"';
			} else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
				tidx = xlmlregex.lastIndex;
			} else NF += "$";
			break;

		case 'text-properties': // <style:text-properties> 16.29.29
			y = parsexmltag(Rn[0], false);
			switch((y["color"]||"").toLowerCase().replace("#", "")) {
				case "ff0000": case "red": NF = "[Red]" + NF; break;
			}
			break;

		case 'text-content': // <number:text-content> 16.29.28
			NF += "@";
			break;

		case 'map': // <style:map> 16.3
			// TODO: handle more complex maps
			y = parsexmltag(Rn[0], false);
			if(unescapexml(y["condition"]) == "value()>=0") NF = number_format_map[y["apply-style-name"]] + ";" + NF;
			else console.error("ODS number format may be incorrect: " + y["condition"]);
			break;

		case 'number': // <number:number> 16.29.3
			// TODO: handle all the attributes
			if(Rn[1]==='/') break;
			y = parsexmltag(Rn[0], false);
			tNF = "";
			tNF += fill("0", +y["min-integer-digits"] || 1);
			if(parsexmlbool(y["grouping"])) tNF = commaify(fill("#", Math.max(0, 4 - tNF.length)) + tNF);
			if(+y["min-decimal-places"] || +y["decimal-places"]) tNF += ".";
			if(+y["min-decimal-places"]) tNF += fill("0", +y["min-decimal-places"] || 1);
			if(+y["decimal-places"] - (+y["min-decimal-places"]||0)) tNF += fill("0", +y["decimal-places"] - (+y["min-decimal-places"]||0)); // TODO: should this be "#" ?
			NF += tNF;
			break;

		case 'embedded-text': // <number:embedded-text> 16.29.4
			// TODO: verify interplay with grouping et al
			if(Rn[1]==='/') {
				if(etpos == 0) NF += '"' + str.slice(tidx, xlmlregex.lastIndex - Rn[0].length).replace(/"/g, '""') + '"';
				else NF = NF.slice(0, etpos) + '"' + str.slice(tidx, xlmlregex.lastIndex - Rn[0].length).replace(/"/g, '""') + '"' + NF.slice(etpos);
			} else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
				tidx = xlmlregex.lastIndex;
				etpos = -+parsexmltag(Rn[0], false)["position"] || 0;
			} break;

	}}
	return number_format_map;
}

function parse_content_xml(d/*:string*/, _opts, _nfm)/*:Workbook*/ {
		var opts = _opts || {};
		if(DENSE != null && opts.dense == null) opts.dense = DENSE;
		var str = xlml_normalize(d);
		var state/*:Array<any>*/ = [], tmp;
		var tag/*:: = {}*/;
		var nfidx, NF = "", pidx = 0;
		var sheetag/*:: = {name:"", '名称':""}*/;
		var rowtag/*:: = {'行号':""}*/;
		var Sheets = {}, SheetNames/*:Array<string>*/ = [];
		var ws = ({}/*:any*/); if(opts.dense) ws["!data"] = [];
		var Rn, q/*:: :any = ({t:"", v:null, z:null, w:"",c:[],}:any)*/;
		var ctag = ({value:""}/*:any*/);
		var textp = "", textpidx = 0, textptag/*:: = {}*/, oldtextp = "", oldtextpidx = 0;
		var textR = [], oldtextR = [];
		var R = -1, C = -1, range = {s: {r:1000000,c:10000000}, e: {r:0, c:0}};
		var row_ol = 0;
		var number_format_map = _nfm || {}, styles = {};
		var merges/*:Array<Range>*/ = [], mrange = {}, mR = 0, mC = 0;
		var rowinfo/*:Array<RowInfo>*/ = [], rowpeat = 1, colpeat = 1;
		var arrayf/*:Array<[Range, string]>*/ = [];
		var WB = {Names:[], WBProps:{}};
		var atag = ({}/*:any*/);
		var _Ref/*:[string, string]*/ = ["", ""];
		var comments/*:Array<Comment>*/ = [], comment/*:Comment*/ = ({}/*:any*/);
		var creator = "", creatoridx = 0;
		var isstub = false, intable = false;
		var i = 0;
		xlmlregex.lastIndex = 0;
		str = remove_doctype(str_remove_ng(str, "<!--", "-->"));
		while((Rn = xlmlregex.exec(str))) switch((Rn[3]=Rn[3].replace(/_[\s\S]*$/,""))) {

			case 'table': case '工作表': // 9.1.2 <table:table>
				if(Rn[1]==='/') {
					if(range.e.c >= range.s.c && range.e.r >= range.s.r) ws['!ref'] = encode_range(range);
					else ws['!ref'] = "A1:A1";
					if(opts.sheetRows > 0 && opts.sheetRows <= range.e.r) {
						ws['!fullref'] = ws['!ref'];
						range.e.r = opts.sheetRows - 1;
						ws['!ref'] = encode_range(range);
					}
					if(merges.length) ws['!merges'] = merges;
					if(rowinfo.length) ws["!rows"] = rowinfo;
					sheetag.name = sheetag['名称'] || sheetag.name;
					if(typeof JSON !== 'undefined') JSON.stringify(sheetag);
					SheetNames.push(sheetag.name);
					Sheets[sheetag.name] = ws;
					intable = false;
				}
				else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
					sheetag = parsexmltag(Rn[0], false);
					R = C = -1;
					range.s.r = range.s.c = 10000000; range.e.r = range.e.c = 0;
					ws = ({}/*:any*/); if(opts.dense) ws["!data"] = []; merges = [];
					rowinfo = [];
					intable = true;
				}
				break;

			case 'table-row-group': // 9.1.9 <table:table-row-group>
				if(Rn[1] === "/") --row_ol; else ++row_ol;
				break;
			case 'table-row': case '行': // 9.1.3 <table:table-row>
				if(Rn[1] === '/') { R+=rowpeat; rowpeat = 1; break; }
				rowtag = parsexmltag(Rn[0], false);
				if(rowtag['行号']) R = rowtag['行号'] - 1; else if(R == -1) R = 0;
				rowpeat = +rowtag['number-rows-repeated'] || 1;
				/* TODO: remove magic */
				if(rowpeat < 10) for(i = 0; i < rowpeat; ++i) if(row_ol > 0) rowinfo[R + i] = {level: row_ol};
				C = -1; break;
			case 'covered-table-cell': // 9.1.5 <table:covered-table-cell>
				if(Rn[1] !== '/') ++C;
				if(opts.sheetStubs) {
					if(opts.dense) { if(!ws["!data"][R]) ws["!data"][R] = []; ws["!data"][R][C] = {t:'z'}; }
					else ws[encode_cell({r:R,c:C})] = {t:'z'};
				}
				textp = ""; textR = [];
				break; /* stub */
			case 'table-cell': case '数据':
				if(Rn[0].charAt(Rn[0].length-2) === '/') {
					++C;
					ctag = parsexmltag(Rn[0], false);
					colpeat = parseInt(ctag['number-columns-repeated']||"1", 10);
					q = ({t:'z', v:null/*:: , z:null, w:"",c:[]*/}/*:any*/);
					if(ctag.formula && opts.cellFormula != false) q.f = ods_to_csf_formula(unescapexml(ctag.formula));
					if(ctag["style-name"] && styles[ctag["style-name"]]) q.z = styles[ctag["style-name"]];
					if((ctag['数据类型'] || ctag['value-type']) == "string") {
						q.t = "s"; q.v = unescapexml(ctag['string-value'] || "");
						if(opts.dense) {
							if(!ws["!data"][R]) ws["!data"][R] = [];
							ws["!data"][R][C] = q;
						} else {
							ws[encode_col(C) + encode_row(R)] = q;
						}
					}
					C+= colpeat-1;
				} else if(Rn[1]!=='/') {
					++C;
					textp = oldtextp = ""; textpidx = oldtextpidx = 0; textR = []; oldtextR = [];
					colpeat = 1;
					var rptR = rowpeat ? R + rowpeat - 1 : R;
					if(C > range.e.c) range.e.c = C;
					if(C < range.s.c) range.s.c = C;
					if(R < range.s.r) range.s.r = R;
					if(rptR > range.e.r) range.e.r = rptR;
					ctag = parsexmltag(Rn[0], false);
					comments = []; comment = ({}/*:any*/);
					q = ({t:ctag['数据类型'] || ctag['value-type'], v:null/*:: , z:null, w:"",c:[]*/}/*:any*/);
					if(ctag["style-name"] && styles[ctag["style-name"]]) q.z = styles[ctag["style-name"]];
					if(opts.cellFormula) {
						if(ctag.formula) ctag.formula = unescapexml(ctag.formula);
						if(ctag['number-matrix-columns-spanned'] && ctag['number-matrix-rows-spanned']) {
							mR = parseInt(ctag['number-matrix-rows-spanned'],10) || 0;
							mC = parseInt(ctag['number-matrix-columns-spanned'],10) || 0;
							mrange = {s: {r:R,c:C}, e:{r:R + mR-1,c:C + mC-1}};
							q.F = encode_range(mrange);
							arrayf.push([mrange, q.F]);
						}
						if(ctag.formula) q.f = ods_to_csf_formula(ctag.formula);
						else for(i = 0; i < arrayf.length; ++i)
							if(R >= arrayf[i][0].s.r && R <= arrayf[i][0].e.r)
								if(C >= arrayf[i][0].s.c && C <= arrayf[i][0].e.c)
									q.F = arrayf[i][1];
					}
					if(ctag['number-columns-spanned'] || ctag['number-rows-spanned']) {
						mR = parseInt(ctag['number-rows-spanned'],10) || 0;
						mC = parseInt(ctag['number-columns-spanned'],10) || 0;
						mrange = {s: {r:R,c:C}, e:{r:R + mR-1,c:C + mC-1}};
						merges.push(mrange);
					}

					/* 19.675.2 table:number-columns-repeated */
					if(ctag['number-columns-repeated']) colpeat = parseInt(ctag['number-columns-repeated'], 10);

					/* 19.385 office:value-type TODO: verify ODS and UOS */
					switch(q.t) {
						case 'boolean': q.t = 'b'; q.v = parsexmlbool(ctag['boolean-value']) || (+ctag['boolean-value'] >= 1); break;
						case 'float': q.t = 'n'; q.v = parseFloat(ctag.value);
							if(opts.cellDates && q.z && fmt_is_date(q.z)) { q.v = numdate(q.v + (WB.WBProps.date1904 ? 1462 : 0)); q.t = typeof q.v == "number" ? 'n' : 'd'; }
							break;
						case 'percentage': q.t = 'n'; q.v = parseFloat(ctag.value); break;
						case 'currency': q.t = 'n'; q.v = parseFloat(ctag.value); break;
						case 'date': q.t = 'd'; q.v = parseDate(ctag['date-value'], WB.WBProps.date1904);
							if(!opts.cellDates) { q.t = 'n'; q.v = datenum(q.v, WB.WBProps.date1904); }
							if(!q.z) q.z = 'm/d/yy'; break;
						/* NOTE: for `time`, Excel ODS export incorrectly uses durations relative to 1900 epoch even if 1904 is specified */
						case 'time': q.t = 'n'; q.v = parse_isodur(ctag['time-value'])/86400;
							if(opts.cellDates) { q.v = numdate(q.v); q.t = typeof q.v == "number" ? 'n' : 'd'; }
							if(!q.z) q.z = 'HH:MM:SS'; break;
						case 'number': q.t = 'n'; q.v = parseFloat(ctag['数据数值']);
							break;
						default:
							if(q.t === 'string' || q.t === 'text' || !q.t) {
								q.t = 's';
								if(ctag['string-value'] != null) { textp = unescapexml(ctag['string-value']); textR = []; }
							} else throw new Error('Unsupported value type ' + q.t);
					}
				} else {
					isstub = false;
					if(q.t === 's') {
						q.v = textp || '';
						if(textR.length) q.R = textR;
						isstub = textpidx == 0;
					}
					if(atag.Target) q.l = atag;
					if(comments.length > 0) { q.c = comments; comments = []; }
					if(textp && opts.cellText !== false) q.w = textp;
					if(isstub) { q.t = "z"; delete q.v; }
					if(!isstub || opts.sheetStubs) {
						if(!(opts.sheetRows && opts.sheetRows <= R)) {
							for(var rpt = 0; rpt < rowpeat; ++rpt) {
								colpeat = parseInt(ctag['number-columns-repeated']||"1", 10);
								if(opts.dense) {
									if(!ws["!data"][R + rpt]) ws["!data"][R + rpt] = [];
									ws["!data"][R + rpt][C] = rpt == 0 ? q : dup(q);
									while(--colpeat > 0) ws["!data"][R + rpt][C + colpeat] = dup(q);
								} else {
									ws[encode_cell({r:R + rpt,c:C})] = q;
									while(--colpeat > 0) ws[encode_cell({r:R + rpt,c:C + colpeat})] = dup(q);
								}
								if(range.e.c <= C) range.e.c = C;
							}
						}
					}
					colpeat = parseInt(ctag['number-columns-repeated']||"1", 10);
					C += colpeat-1; colpeat = 0;
					q = {/*:: t:"", v:null, z:null, w:"",c:[]*/};
					textp = ""; textR = [];
				}
				atag = ({}/*:any*/);
				break; // 9.1.4 <table:table-cell>

			/* pure state */
			case 'document': // TODO: <office:document> is the root for FODS
			case 'document-content': case '电子表格文档': // 3.1.3.2 <office:document-content>
			case 'spreadsheet': case '主体': // 3.7 <office:spreadsheet>
			case 'scripts': // 3.12 <office:scripts>
			case 'styles': // TODO <office:styles>
			case 'font-face-decls': // 3.14 <office:font-face-decls>
			case 'master-styles': // 3.15.4 <office:master-styles> -- relevant for FODS
				if(Rn[1]==='/'){if((tmp=state.pop())[0]!==Rn[3]) throw "Bad state: "+tmp;}
				else if(Rn[0].charAt(Rn[0].length-2) !== '/') state.push([Rn[3], true]);
				break;

			case 'annotation': // 14.1 <office:annotation>
				if(Rn[1]==='/'){
					if((tmp=state.pop())[0]!==Rn[3]) throw "Bad state: "+tmp;
					comment.t = textp;
					if(textR.length) /*::(*/comment/*:: :any)*/.R = textR;
					comment.a = creator;
					comments.push(comment);
					textp = oldtextp; textpidx = oldtextpidx; textR = oldtextR;
				}
				else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
					state.push([Rn[3], false]);
					var annotag = parsexmltag(Rn[0], true);
					/* office:display TODO: check if there is a global override */
					if(!(annotag["display"] && parsexmlbool(annotag["display"]))) comments.hidden = true;
					oldtextp = textp; oldtextpidx = textpidx; oldtextR = textR;
					textp = ""; textpidx = 0; textR = [];
				}
				creator = ""; creatoridx = 0;
				break;

			case 'creator': // 4.3.2.7 <dc:creator>
				if(Rn[1]==='/') { creator = str.slice(creatoridx,Rn.index); }
				else creatoridx = Rn.index + Rn[0].length;
				break;

			/* ignore state */
			case 'meta': case '元数据': // TODO: <office:meta> <uof:元数据> FODS/UOF
			case 'settings': // TODO: <office:settings>
			case 'config-item-set': // TODO: <office:config-item-set>
			case 'config-item-map-indexed': // TODO: <office:config-item-map-indexed>
			case 'config-item-map-entry': // TODO: <office:config-item-map-entry>
			case 'config-item-map-named': // TODO: <office:config-item-map-entry>
			case 'shapes': // 9.2.8 <table:shapes>
			case 'frame': // 10.4.2 <draw:frame>
			case 'text-box': // 10.4.3 <draw:text-box>
			case 'image': // 10.4.4 <draw:image>
			case 'data-pilot-tables': // 9.6.2 <table:data-pilot-tables>
			case 'list-style': // 16.30 <text:list-style>
			case 'form': // 13.13 <form:form>
			case 'dde-links': // 9.8 <table:dde-links>
			case 'event-listeners': // TODO
			case 'chart': // TODO
				if(Rn[1]==='/'){if((tmp=state.pop())[0]!==Rn[3]) throw "Bad state: "+tmp;}
				else if(Rn[0].charAt(Rn[0].length-2) !== '/') state.push([Rn[3], false]);
				textp = ""; textpidx = 0; textR = [];
				break;

			case 'scientific-number': // <number:scientific-number>
			case 'currency-symbol': // <number:currency-symbol>
			case 'fill-character': // 16.29.5 <number:fill-character>
				break;

			case 'text-style': // 16.27.25 <number:text-style>
			case 'boolean-style': // 16.27.23 <number:boolean-style>
			case 'number-style': // 16.27.2 <number:number-style>
			case 'currency-style': // 16.29.8 <number:currency-style>
			case 'percentage-style': // 16.27.9 <number:percentage-style>
			case 'date-style': // 16.27.10 <number:date-style>
			case 'time-style': // 16.27.18 <number:time-style>
				if(Rn[1]==='/'){
					var xlmlidx = xlmlregex.lastIndex;
					parse_ods_styles(str.slice(nfidx, xlmlregex.lastIndex), _opts, number_format_map);
					xlmlregex.lastIndex = xlmlidx;
				} else if(Rn[0].charAt(Rn[0].length-2) !== '/') {
					nfidx = xlmlregex.lastIndex - Rn[0].length;
				} break;

			case 'script': break; // 3.13 <office:script>
			case 'libraries': break; // TODO: <ooo:libraries>
			case 'automatic-styles': break; // 3.15.3 <office:automatic-styles>

			case 'default-style': // TODO: <style:default-style>
			case 'page-layout': break; // TODO: <style:page-layout>
			case 'style': { // 16.2 <style:style>
				var styletag = parsexmltag(Rn[0], false);
				if(styletag["family"] == "table-cell" && number_format_map[styletag["data-style-name"]]) styles[styletag["name"]] = number_format_map[styletag["data-style-name"]];
			} break;
			case 'map': break; // 16.3 <style:map>
			case 'font-face': break; // 16.21 <style:font-face>

			case 'paragraph-properties': break; // 17.6 <style:paragraph-properties>
			case 'table-properties': break; // 17.15 <style:table-properties>
			case 'table-column-properties': break; // 17.16 <style:table-column-properties>
			case 'table-row-properties': break; // 17.17 <style:table-row-properties>
			case 'table-cell-properties': break; // 17.18 <style:table-cell-properties>

			case 'number': // 16.27.3 <number:number>
				break;

			case 'fraction': break; // TODO 16.27.6 <number:fraction>

			case 'day': // 16.27.11 <number:day>
			case 'month': // 16.27.12 <number:month>
			case 'year': // 16.27.13 <number:year>
			case 'era': // 16.27.14 <number:era>
			case 'day-of-week': // 16.27.15 <number:day-of-week>
			case 'week-of-year': // 16.27.16 <number:week-of-year>
			case 'quarter': // 16.27.17 <number:quarter>
			case 'hours': // 16.27.19 <number:hours>
			case 'minutes': // 16.27.20 <number:minutes>
			case 'seconds': // 16.27.21 <number:seconds>
			case 'am-pm': // 16.27.22 <number:am-pm>
				break;

			case 'boolean': break; // 16.27.24 <number:boolean>
			case 'text': // 16.27.26 <number:text>
				if(Rn[0].slice(-2) === "/>") break;
				else if(Rn[1]==="/") switch(state[state.length-1][0]) {
					case 'number-style':
					case 'date-style':
					case 'time-style':
						NF += str.slice(pidx, Rn.index);
						break;
				}
				else pidx = Rn.index + Rn[0].length;
				break;

			case 'named-range': // 9.4.12 <table:named-range>
				tag = parsexmltag(Rn[0], false);
				_Ref = ods_to_csf_3D(tag['cell-range-address']);
				var nrange = ({Name:tag.name, Ref:_Ref[0] + '!' + _Ref[1]}/*:any*/);
				if(intable) nrange.Sheet = SheetNames.length;
				WB.Names.push(nrange);
				break;

			case 'text-content': break; // 16.27.27 <number:text-content>
			case 'text-properties': break; // 16.27.27 <style:text-properties>
			case 'embedded-text': break; // 16.27.4 <number:embedded-text>

			case 'body': case '电子表格': break; // 3.3 16.9.6 19.726.3

			case 'forms': break; // 12.25.2 13.2
			case 'table-column': break; // 9.1.6 <table:table-column>
			case 'table-header-rows': break; // 9.1.7 <table:table-header-rows>
			case 'table-rows': break; // 9.1.12 <table:table-rows>
			/* TODO: outline levels */
			case 'table-column-group': break; // 9.1.10 <table:table-column-group>
			case 'table-header-columns': break; // 9.1.11 <table:table-header-columns>
			case 'table-columns': break; // 9.1.12 <table:table-columns>

			case 'null-date': // 9.4.2 <table:null-date>
				tag = parsexmltag(Rn[0], false);
				switch(tag["date-value"]) {
					case "1904-01-01": WB.WBProps.date1904 = true; break;
				}
				break;

			case 'graphic-properties': break; // 17.21 <style:graphic-properties>
			case 'calculation-settings': break; // 9.4.1 <table:calculation-settings>
			case 'named-expressions': break; // 9.4.11 <table:named-expressions>
			case 'label-range': break; // 9.4.9 <table:label-range>
			case 'label-ranges': break; // 9.4.10 <table:label-ranges>
			case 'named-expression': break; // 9.4.13 <table:named-expression>
			case 'sort': break; // 9.4.19 <table:sort>
			case 'sort-by': break; // 9.4.20 <table:sort-by>
			case 'sort-groups': break; // 9.4.22 <table:sort-groups>

			case 'tab': break; // 6.1.4 <text:tab>
			case 'line-break': break; // 6.1.5 <text:line-break>
			case 'span': break; // 6.1.7 <text:span>
			case 'p': case '文本串': // 5.1.3 <text:p>
				if(['master-styles'].indexOf(state[state.length-1][0]) > -1) break;
				if(Rn[1]==='/' && (!ctag || !ctag['string-value'])) {
					var ptp = parse_text_p(str.slice(textpidx,Rn.index), textptag);
					textp = (textp.length > 0 ? textp + "\n" : "") + ptp[0];
				} else if(Rn[0].slice(-2) == "/>") {
					/* TODO: is self-closing 文本串 valid? */
					textp += "\n";
				} else { textptag = parsexmltag(Rn[0], false); textpidx = Rn.index + Rn[0].length; }
				break; // <text:p>
			case 's': break; // <text:s>

			case 'database-range': // 9.4.15 <table:database-range>
				if(Rn[1]==='/') break;
				try {
					_Ref = ods_to_csf_3D(parsexmltag(Rn[0])['target-range-address']);
					Sheets[_Ref[0]]['!autofilter'] = { ref:_Ref[1] };
				} catch(e) {/* empty */}
				break;

			case 'date': break; // <*:date>

			case 'object': break; // 10.4.6.2 <draw:object>
			case 'title': case '标题': break; // <*:title> OR <uof:标题>
			case 'desc': break; // <*:desc>
			case 'binary-data': break; // 10.4.5 TODO: b64 blob

			/* 9.2 Advanced Tables */
			case 'table-source': break; // 9.2.6
			case 'scenario': break; // 9.2.6

			case 'iteration': break; // 9.4.3 <table:iteration>
			case 'content-validations': break; // 9.4.4 <table:
			case 'content-validation': break; // 9.4.5 <table:
			case 'help-message': break; // 9.4.6 <table:
			case 'error-message': break; // 9.4.7 <table:
			case 'database-ranges': break; // 9.4.14 <table:database-ranges>

			/* 9.5 Filters */
			case 'filter': break; // 9.5.2 <table:filter>
			case 'filter-and': break; // 9.5.3 <table:filter-and>
			case 'filter-or': break; // 9.5.4 <table:filter-or>
			case 'filter-condition': break; // 9.5.5 <table:filter-condition>
			case 'filter-set-item': break; // 9.5.6 <table:filter-condition>

			case 'list-level-style-bullet': break; // 16.31 <text:
			case 'list-level-style-number': break; // 16.32 <text:
			case 'list-level-properties': break; // 17.19 <style:

			/* 7.3 Document Fields */
			case 'sender-firstname': // 7.3.6.2
			case 'sender-lastname': // 7.3.6.3
			case 'sender-initials': // 7.3.6.4
			case 'sender-title': // 7.3.6.5
			case 'sender-position': // 7.3.6.6
			case 'sender-email': // 7.3.6.7
			case 'sender-phone-private': // 7.3.6.8
			case 'sender-fax': // 7.3.6.9
			case 'sender-company': // 7.3.6.10
			case 'sender-phone-work': // 7.3.6.11
			case 'sender-street': // 7.3.6.12
			case 'sender-city': // 7.3.6.13
			case 'sender-postal-code': // 7.3.6.14
			case 'sender-country': // 7.3.6.15
			case 'sender-state-or-province': // 7.3.6.16
			case 'author-name': // 7.3.7.1
			case 'author-initials': // 7.3.7.2
			case 'chapter': // 7.3.8
			case 'file-name': // 7.3.9
			case 'template-name': // 7.3.9
			case 'sheet-name': // 7.3.9
				break;

			case 'event-listener':
				break;
			/* TODO: FODS Properties */
			case 'initial-creator':
			case 'creation-date':
			case 'print-date':
			case 'generator':
			case 'document-statistic':
			case 'user-defined':
			case 'editing-duration':
			case 'editing-cycles':
				break;

			/* TODO: FODS Config */
			case 'config-item':
				break;

			/* TODO: style tokens */
			case 'page-number': break; // TODO <text:page-number>
			case 'page-count': break; // TODO <text:page-count>
			case 'time': break; // TODO <text:time>

			/* 9.3 Advanced Table Cells */
			case 'cell-range-source': break; // 9.3.1 <table:
			case 'detective': break; // 9.3.2 <table:
			case 'operation': break; // 9.3.3 <table:
			case 'highlighted-range': break; // 9.3.4 <table:

			/* 9.6 Data Pilot Tables <table: */
			case 'data-pilot-table': // 9.6.3
			case 'source-cell-range': // 9.6.5
			case 'source-service': // 9.6.6
			case 'data-pilot-field': // 9.6.7
			case 'data-pilot-level': // 9.6.8
			case 'data-pilot-subtotals': // 9.6.9
			case 'data-pilot-subtotal': // 9.6.10
			case 'data-pilot-members': // 9.6.11
			case 'data-pilot-member': // 9.6.12
			case 'data-pilot-display-info': // 9.6.13
			case 'data-pilot-sort-info': // 9.6.14
			case 'data-pilot-layout-info': // 9.6.15
			case 'data-pilot-field-reference': // 9.6.16
			case 'data-pilot-groups': // 9.6.17
			case 'data-pilot-group': // 9.6.18
			case 'data-pilot-group-member': // 9.6.19
				break;

			/* 10.3 Drawing Shapes */
			case 'rect': // 10.3.2
				break;

			/* 14.6 DDE Connections */
			case 'dde-connection-decls': // 14.6.2 <text:
			case 'dde-connection-decl': // 14.6.3 <text:
			case 'dde-link': // 14.6.4 <table:
			case 'dde-source': // 14.6.5 <office:
				break;

			case 'properties': break; // 13.7 <form:properties>
			case 'property': break; // 13.8 <form:property>

			case 'a': // 6.1.8 hyperlink
				if(Rn[1]!== '/') {
					atag = parsexmltag(Rn[0], false);
					if(!atag.href) break;
					atag.Target = unescapexml(atag.href); delete atag.href;
					if(atag.Target.charAt(0) == "#" && atag.Target.indexOf(".") > -1) {
						_Ref = ods_to_csf_3D(atag.Target.slice(1));
						atag.Target = "#" + _Ref[0] + "!" + _Ref[1];
					} else if(atag.Target.match(/^\.\.[\\\/]/)) atag.Target = atag.Target.slice(3);
				}
				break;

			/* non-standard */
			case 'table-protection': break;
			case 'data-pilot-grand-total': break; // <table:
			case 'office-document-common-attrs': break; // bare
			default: switch(Rn[2]) {
				case 'dc:':       // TODO: properties
				case 'calcext:':  // ignore undocumented extensions
				case 'loext:':    // ignore undocumented extensions
				case 'ooo:':      // ignore undocumented extensions
				case 'chartooo:': // ignore undocumented extensions
				case 'draw:':     // TODO: drawing
				case 'style:':    // TODO: styles
				case 'chart:':    // TODO: charts
				case 'form:':     // TODO: forms
				case 'uof:':      // TODO: uof
				case '表:':       // TODO: uof
				case '字:':       // TODO: uof
					break;
				default: if(opts.WTF) throw new Error(Rn);
			}
		}
		var out/*:Workbook*/ = ({
			Sheets: Sheets,
			SheetNames: SheetNames,
			Workbook: WB
		}/*:any*/);
		if(opts.bookSheets) delete /*::(*/out/*:: :any)*/.Sheets;
		return out;
}

function parse_ods(zip/*:ZIPFile*/, opts/*:?ParseOpts*/)/*:Workbook*/ {
	opts = opts || ({}/*:any*/);
	if(safegetzipfile(zip, 'META-INF/manifest.xml')) parse_manifest(getzipdata(zip, 'META-INF/manifest.xml'), opts);
	var styles = getzipstr(zip, 'styles.xml');
	var Styles = styles && parse_ods_styles(utf8read(styles), opts);
	var content = getzipstr(zip, 'content.xml');
	if(!content) throw new Error("Missing content.xml in ODS / UOF file");
	var wb = parse_content_xml(utf8read(content), opts, Styles);
	if(safegetzipfile(zip, 'meta.xml')) wb.Props = parse_core_props(getzipdata(zip, 'meta.xml'));
	wb.bookType = "ods";
	return wb;
}
function parse_fods(data/*:string*/, opts/*:?ParseOpts*/)/*:Workbook*/ {
	var wb = parse_content_xml(data, opts);
	wb.bookType = "fods";
	return wb;
}

/* OpenDocument */
var write_styles_ods/*:{(wb:any, opts:any):string}*/ = /* @__PURE__ */(function() {
	var master_styles = [
		'<office:master-styles>',
			'<style:master-page style:name="mp1" style:page-layout-name="mp1">',
				'<style:header/>',
				'<style:header-left style:display="false"/>',
				'<style:footer/>',
				'<style:footer-left style:display="false"/>',
			'</style:master-page>',
		'</office:master-styles>'
	].join("");

	var payload = '<office:document-styles ' + wxt_helper({
		'xmlns:office':   "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
		'xmlns:table':    "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
		'xmlns:style':    "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
		'xmlns:text':     "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
		'xmlns:draw':     "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
		'xmlns:fo':       "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
		'xmlns:xlink':    "http://www.w3.org/1999/xlink",
		'xmlns:dc':       "http://purl.org/dc/elements/1.1/",
		'xmlns:number':   "urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0",
		'xmlns:svg':      "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
		'xmlns:of':       "urn:oasis:names:tc:opendocument:xmlns:of:1.2",
		'office:version': "1.2"
	}) + '>' + master_styles + '</office:document-styles>';

	return function wso(/*::wb, opts*/) {
		return XML_HEADER + payload;
	};
})();

// TODO: find out if anyone actually read the spec.  LO has some wild errors
function write_number_format_ods(nf/*:string*/, nfidx/*:string*/)/*:string*/ {
	var type = "number", payload = "", nopts = { "style:name": nfidx }, c = "", i = 0;
	nf = nf.replace(/"[$]"/g, "$");
	/* TODO: replace with an actual parser based on a real grammar */
	j: {
		// TODO: support style maps
		if(nf.indexOf(";") > -1) {
			console.error("Unsupported ODS Style Map exported.  Using first branch of " + nf);
			nf = nf.slice(0, nf.indexOf(";"));
		}

		if(nf == "@") { type = "text"; payload = "<number:text-content/>"; break j; }

		/* currency flag */
		if(nf.indexOf(/\$/) > -1) { type = "currency"; }

		/* opening string literal */
		if(nf[i] == '"') {
			c = "";
			while(nf[++i] != '"' || nf[++i] == '"') c += nf[i]; --i;
			if(nf[i+1] == "*") {
				i++;
				payload += '<number:fill-character>' + escapexml(c.replace(/""/g, '"')) + '</number:fill-character>';
			} else {
				payload += '<number:text>' + escapexml(c.replace(/""/g, '"')) + '</number:text>';
			}
			nf = nf.slice(i+1); i = 0;
		}

		/* fractions */
		var t = nf.match(/# (\?+)\/(\?+)/);
		if(t) { payload += writextag("number:fraction", null, {"number:min-integer-digits":0, "number:min-numerator-digits": t[1].length, "number:max-denominator-value": Math.max(+(t[1].replace(/./g, "9")), +(t[2].replace(/./g, "9"))) }); break j; }
		if((t=nf.match(/# (\?+)\/(\d+)/))) { payload += writextag("number:fraction", null, {"number:min-integer-digits":0, "number:min-numerator-digits": t[1].length, "number:denominator-value": +t[2]}); break j; }

		/* percentages */
		if((t=nf.match(/\b(\d+)(|\.\d+)%/))) { type = "percentage"; payload += writextag("number:number", null, {"number:decimal-places": t[2] && t.length - 1 || 0, "number:min-decimal-places": t[2] && t.length - 1 || 0, "number:min-integer-digits": t[1].length }) + "<number:text>%</number:text>"; break j; }

		/* datetime */
		var has_time = false;
		if(["y","m","d"].indexOf(nf[0]) > -1) {
			type = "date";
			k: for(; i < nf.length; ++i) switch((c = nf[i].toLowerCase())) {
				case "h": case "s": has_time = true; --i; break k;
				case "m":
					l: for(var h = i+1; h < nf.length; ++h) switch(nf[h]) {
						case "y": case "d": break l;
						case "h": case "s": has_time = true; --i; break k;
					}
					/* falls through */
				case "y": case "d":
					while((nf[++i]||"").toLowerCase() == c[0]) c += c[0]; --i;
					switch(c) {
						case "y": case "yy": payload += "<number:year/>"; break;
						case "yyy": case "yyyy": payload += '<number:year number:style="long"/>'; break;
						case "mmmmm": console.error("ODS has no equivalent of format |mmmmm|");
							/* falls through */
						case "m": case "mm": case "mmm": case "mmmm":
							payload += '<number:month number:style="' + (c.length % 2 ? "short" : "long") + '" number:textual="' + (c.length >= 3 ? "true" : "false") + '"/>';
							break;
						case "d": case "dd": payload += '<number:day number:style="' + (c.length % 2 ? "short" : "long") + '"/>'; break;
						case "ddd": case "dddd": payload += '<number:day-of-week number:style="' + (c.length % 2 ? "short" : "long") + '"/>'; break;
					}
					break;
				case '"':
					while(nf[++i] != '"' || nf[++i] == '"') c += nf[i]; --i;
					payload += '<number:text>' + escapexml(c.slice(1).replace(/""/g, '"')) + '</number:text>';
					break;
				case '\\': c = nf[++i];
					payload += '<number:text>' + escapexml(c) + '</number:text>'; break;
				case '/': case ':': payload += '<number:text>' + escapexml(c) + '</number:text>'; break;
				default: console.error("unrecognized character " + c + " in ODF format " + nf);
			}
			if(!has_time) break j;
			nf = nf.slice(i+1); i = 0;
		}
		if(nf.match(/^\[?[hms]/)) {
			if(type == "number") type = "time";
			if(nf.match(/\[/)) {
				nf = nf.replace(/[\[\]]/g, "");
				nopts['number:truncate-on-overflow'] = "false";
			}
			for(; i < nf.length; ++i) switch((c = nf[i].toLowerCase())) {
				case "h": case "m": case "s":
					while((nf[++i]||"").toLowerCase() == c[0]) c += c[0]; --i;
					switch(c) {
						case "h": case "hh": payload += '<number:hours number:style="' + (c.length % 2 ? "short" : "long") + '"/>'; break;
						case "m": case "mm": payload += '<number:minutes number:style="' + (c.length % 2 ? "short" : "long") + '"/>'; break;
						case "s": case "ss":
							if(nf[i+1] == ".") do { c += nf[i+1]; ++i; } while(nf[i+1] == "0");
							payload += '<number:seconds number:style="' + (c.match("ss") ? "long" : "short") + '"' + (c.match(/\./) ? ' number:decimal-places="' + (c.match(/0+/)||[""])[0].length + '"' : "")+ '/>'; break;
					}
					break;
				case '"':
					while(nf[++i] != '"' || nf[++i] == '"') c += nf[i]; --i;
					payload += '<number:text>' + escapexml(c.slice(1).replace(/""/g, '"')) + '</number:text>';
					break;
				case '/': case ':': payload += '<number:text>' + escapexml(c) + '</number:text>'; break;
				case "a":
					if(nf.slice(i, i+3).toLowerCase() == "a/p") { payload += '<number:am-pm/>'; i += 2; break; } // Note: ODF does not support A/P
					if(nf.slice(i, i+5).toLowerCase() == "am/pm")  { payload += '<number:am-pm/>'; i += 4; break; }
					/* falls through */
				default: console.error("unrecognized character " + c + " in ODF format " + nf);
			}
			break j;
		}

		/* currency flag */
		if(nf.indexOf(/\$/) > -1) { type = "currency"; }

		/* should be in a char loop */
		if(nf[0] == "$") { payload += '<number:currency-symbol number:language="en" number:country="US">$</number:currency-symbol>'; nf = nf.slice(1); i = 0; }
		i = 0; if(nf[i] == '"') {
			while(nf[++i] != '"' || nf[++i] == '"') c += nf[i]; --i;
			if(nf[i+1] == "*") {
				i++;
				payload += '<number:fill-character>' + escapexml(c.replace(/""/g, '"')) + '</number:fill-character>';
			} else {
				payload += '<number:text>' + escapexml(c.replace(/""/g, '"')) + '</number:text>';
			}
			nf = nf.slice(i+1); i = 0;
		}

		/* number TODO: interstitial text e.g. 000)000-0000 */
		var np = nf.match(/([#0][0#,]*)(\.[0#]*|)(E[+]?0*|)/i);
		if(!np || !np[0]) console.error("Could not find numeric part of " + nf);
		else {
			var base = np[1].replace(/,/g, "");
			payload += '<number:' + (np[3] ? "scientific-" : "")+ 'number' +
				' number:min-integer-digits="' + (base.indexOf("0") == -1 ? "0" : base.length - base.indexOf("0")) + '"' +
				(np[0].indexOf(",") > -1 ? ' number:grouping="true"' : "") +
				(np[2] && ' number:decimal-places="' + (np[2].length - 1) + '"' || ' number:decimal-places="0"') +
				(np[3] && np[3].indexOf("+") > -1 ? ' number:forced-exponent-sign="true"' : "" ) +
				(np[3] ? ' number:min-exponent-digits="' + np[3].match(/0+/)[0].length + '"' : "" ) +
				'>' +
				/* TODO: interstitial text placeholders */
				'</number:' + (np[3] ? "scientific-" : "") + 'number>';
			i = np.index + np[0].length;
		}

		/* residual text */
		if(nf[i] == '"') {
			c = "";
			while(nf[++i] != '"' || nf[++i] == '"') c += nf[i]; --i;
			payload += '<number:text>' + escapexml(c.replace(/""/g, '"')) + '</number:text>';
		}
	}

	if(!payload) { console.error("Could not generate ODS number format for |" + nf + "|"); return ""; }
	return writextag("number:" + type + "-style", payload, nopts);
}

function write_names_ods(Names, SheetNames, idx) {
	//var scoped = Names.filter(function(name) { return name.Sheet == (idx == -1 ? null : idx); });
	var scoped = []; for(var namei = 0; namei < Names.length; ++namei) {
		var name = Names[namei];
		if(!name) continue;
		if(name.Sheet == (idx == -1 ? null : idx)) scoped.push(name);
	}
	if(!scoped.length) return "";
	return "      <table:named-expressions>\n" + scoped.map(function(name) {
		var odsref =  (idx == -1 ? "$" : "") + csf_to_ods_3D(name.Ref);
		return "        " + writextag("table:named-range", null, {
			"table:name": name.Name,
			"table:cell-range-address": odsref,
			"table:base-cell-address": odsref.replace(/[\.][^\.]*$/, ".$A$1")
		});
	}).join("\n") + "\n      </table:named-expressions>\n";
}
var write_content_ods/*:{(wb:any, opts:any):string}*/ = /* @__PURE__ */(function() {
	/* 6.1.2 White Space Characters */
	var write_text_p = function(text/*:string*/, span)/*:string*/ {
		return escapexml(text)
			.replace(/  +/g, function($$){return '<text:s text:c="'+$$.length+'"/>';})
			.replace(/\t/g, "<text:tab/>")
			.replace(/\n/g, span ? "<text:line-break/>": "</text:p><text:p>")
			.replace(/^ /, "<text:s/>").replace(/ $/, "<text:s/>");
	};

	var null_cell_xml = '          <table:table-cell />\n';
	var write_ws = function(ws, wb/*:Workbook*/, i/*:number*/, opts, nfs, date1904)/*:string*/ {
		/* Section 9 Tables */
		var o/*:Array<string>*/ = [];
		o.push('      <table:table table:name="' + escapexml(wb.SheetNames[i]) + '" table:style-name="ta1">\n');
		var R=0,C=0, range = decode_range(ws['!ref']||"A1");
		var marr/*:Array<Range>*/ = ws['!merges'] || [], mi = 0;
		var dense = ws["!data"] != null;
		if(ws["!cols"]) {
			for(C = 0; C <= range.e.c; ++C) o.push('        <table:table-column' + (ws["!cols"][C] ? ' table:style-name="co' + ws["!cols"][C].ods + '"' : '') + '></table:table-column>\n');
		}
		var H = "", ROWS = ws["!rows"]||[];
		for(R = 0; R < range.s.r; ++R) {
			H = ROWS[R] ? ' table:style-name="ro' + ROWS[R].ods + '"' : "";
			o.push('        <table:table-row' + H + '></table:table-row>\n');
		}
		for(; R <= range.e.r; ++R) {
			H = ROWS[R] ? ' table:style-name="ro' + ROWS[R].ods + '"' : "";
			o.push('        <table:table-row' + H + '>\n');
			for(C=0; C < range.s.c; ++C) o.push(null_cell_xml);
			for(; C <= range.e.c; ++C) {
				var skip = false, ct = {}, textp = "";
				for(mi = 0; mi != marr.length; ++mi) {
					if(marr[mi].s.c > C) continue;
					if(marr[mi].s.r > R) continue;
					if(marr[mi].e.c < C) continue;
					if(marr[mi].e.r < R) continue;
					if(marr[mi].s.c != C || marr[mi].s.r != R) skip = true;
					ct['table:number-columns-spanned'] = (marr[mi].e.c - marr[mi].s.c + 1);
					ct['table:number-rows-spanned'] =    (marr[mi].e.r - marr[mi].s.r + 1);
					break;
				}
				if(skip) { o.push('          <table:covered-table-cell/>\n'); continue; }
				var ref = encode_cell({r:R, c:C}), cell = dense ? (ws["!data"][R]||[])[C]: ws[ref];
				if(cell && cell.f) {
					ct['table:formula'] = escapexml(csf_to_ods_formula(cell.f));
					if(cell.F) {
						if(cell.F.slice(0, ref.length) == ref) {
							var _Fref = decode_range(cell.F);
							ct['table:number-matrix-columns-spanned'] = (_Fref.e.c - _Fref.s.c + 1);
							ct['table:number-matrix-rows-spanned'] =    (_Fref.e.r - _Fref.s.r + 1);
						}
					}
				}
				if(!cell) { o.push(null_cell_xml); continue; }
				switch(cell.t) {
					case 'b':
						textp = (cell.v ? 'TRUE' : 'FALSE');
						ct['office:value-type'] = "boolean";
						ct['office:boolean-value'] = (cell.v ? 'true' : 'false');
						break;
					case 'n':
						textp = (cell.w||String(cell.v||0));
						ct['office:value-type'] = "float";
						ct['office:value'] = (cell.v||0);
						break;
					case 's': case 'str':
						textp = cell.v == null ? "" : cell.v;
						ct['office:value-type'] = "string";
						break;
					case 'd':
						textp = (cell.w||(parseDate(cell.v, date1904).toISOString()));
						ct['office:value-type'] = "date";
						ct['office:date-value'] = (parseDate(cell.v, date1904).toISOString());
						ct['table:style-name'] = "ce1";
						break;
					//case 'e': // TODO: translate to ODS errors
					default: o.push(null_cell_xml); continue; // TODO: empty cell with comments
				}
				var text_p = write_text_p(textp);
				if(cell.l && cell.l.Target) {
					var _tgt = cell.l.Target;
					_tgt = _tgt.charAt(0) == "#" ? "#" + csf_to_ods_3D(_tgt.slice(1)) : _tgt;
					// TODO: choose correct parent path format based on link delimiters
					if(_tgt.charAt(0) != "#" && !_tgt.match(/^\w+:/)) _tgt = '../' + _tgt;
					text_p = writextag('text:a', text_p, {'xlink:href': _tgt.replace(/&/g, "&amp;")});
				}
				if(nfs[cell.z]) ct["table:style-name"] = "ce" + nfs[cell.z].slice(1);
				var payload = writextag('text:p', text_p, {});
				if(cell.c) {
					var acreator = "", apayload = "", aprops = {};
					for(var ci = 0; ci < cell.c.length; ++ci) {
						if(!acreator && cell.c[ci].a) acreator = cell.c[ci].a;
						apayload += "<text:p>" + write_text_p(cell.c[ci].t) + "</text:p>";
					}
					if(!cell.c.hidden) aprops["office:display"] = true;
					payload = writextag('office:annotation', apayload, aprops) + payload;
				}
				o.push('          ' + writextag('table:table-cell', payload, ct) + '\n');
			}
			o.push('        </table:table-row>\n');
		}
		if((wb.Workbook||{}).Names) o.push(write_names_ods(wb.Workbook.Names, wb.SheetNames, i));
		o.push('      </table:table>\n');
		return o.join("");
	};

	var write_automatic_styles_ods = function(o/*:Array<string>*/, wb) {
		o.push(' <office:automatic-styles>\n');

		/* column styles */
		var cidx = 0;
		wb.SheetNames.map(function(n) { return wb.Sheets[n]; }).forEach(function(ws) {
			if(!ws) return;
			if(ws["!cols"]) {
				for(var C = 0; C < ws["!cols"].length; ++C) if(ws["!cols"][C]) {
					var colobj = ws["!cols"][C];
					if(colobj.width == null && colobj.wpx == null && colobj.wch == null) continue;
					process_col(colobj);
					colobj.ods = cidx;
					var w = ws["!cols"][C].wpx + "px";
					o.push('  <style:style style:name="co' + cidx + '" style:family="table-column">\n');
					o.push('   <style:table-column-properties fo:break-before="auto" style:column-width="' + w + '"/>\n');
					o.push('  </style:style>\n');
					++cidx;
				}
			}
		});

		/* row styles */
		var ridx = 0;
		wb.SheetNames.map(function(n) { return wb.Sheets[n]; }).forEach(function(ws) {
			if(!ws) return;
			if(ws["!rows"]) {
				for(var R = 0; R < ws["!rows"].length; ++R) if(ws["!rows"][R]) {
					ws["!rows"][R].ods = ridx;
					var h = ws["!rows"][R].hpx + "px";
					o.push('  <style:style style:name="ro' + ridx + '" style:family="table-row">\n');
					o.push('   <style:table-row-properties fo:break-before="auto" style:row-height="' + h + '"/>\n');
					o.push('  </style:style>\n');
					++ridx;
				}
			}
		});

		/* table */
		o.push('  <style:style style:name="ta1" style:family="table" style:master-page-name="mp1">\n');
		o.push('   <style:table-properties table:display="true" style:writing-mode="lr-tb"/>\n');
		o.push('  </style:style>\n');

		o.push('  <number:date-style style:name="N37" number:automatic-order="true">\n');
		o.push('   <number:month number:style="long"/>\n');
		o.push('   <number:text>/</number:text>\n');
		o.push('   <number:day number:style="long"/>\n');
		o.push('   <number:text>/</number:text>\n');
		o.push('   <number:year/>\n');
		o.push('  </number:date-style>\n');

		/* number formats, table cells, text */
		var nfs = {};
		var nfi = 69;
		wb.SheetNames.map(function(n) { return wb.Sheets[n]; }).forEach(function(ws) {
			if(!ws) return;
			var dense = (ws["!data"] != null);
			if(!ws["!ref"]) return;
			var range = decode_range(ws["!ref"]);
			for(var R = 0; R <= range.e.r; ++R) for(var C = 0; C <= range.e.c; ++C) {
				var c = dense ? (ws["!data"][R]||[])[C] : ws[encode_cell({r:R,c:C})];
				if(!c || !c.z || c.z.toLowerCase() == "general") continue;
				if(!nfs[c.z]) {
					var out = write_number_format_ods(c.z, "N" + nfi);
					if(out) { nfs[c.z] = "N" + nfi; ++nfi; o.push(out + "\n"); }
				}
			}
		});
		o.push('  <style:style style:name="ce1" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="N37"/>\n');
		keys(nfs).forEach(function(nf) {
			o.push('<style:style style:name="ce' + nfs[nf].slice(1) + '" style:family="table-cell" style:parent-style-name="Default" style:data-style-name="' + nfs[nf] + '"/>\n');
		});

		/* page-layout */

		o.push(' </office:automatic-styles>\n');
		return nfs;
	};

	return function wcx(wb, opts) {
		var o = [XML_HEADER];
		/* 3.1.3.2 */
		var attr = wxt_helper({
			'xmlns:office':       "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
			'xmlns:table':        "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
			'xmlns:style':        "urn:oasis:names:tc:opendocument:xmlns:style:1.0",
			'xmlns:text':         "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
			'xmlns:draw':         "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
			'xmlns:fo':           "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0",
			'xmlns:xlink':        "http://www.w3.org/1999/xlink",
			'xmlns:dc':           "http://purl.org/dc/elements/1.1/",
			'xmlns:meta':         "urn:oasis:names:tc:opendocument:xmlns:meta:1.0",
			'xmlns:number':       "urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0",
			'xmlns:presentation': "urn:oasis:names:tc:opendocument:xmlns:presentation:1.0",
			'xmlns:svg':          "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0",
			'xmlns:chart':        "urn:oasis:names:tc:opendocument:xmlns:chart:1.0",
			'xmlns:dr3d':         "urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0",
			'xmlns:math':         "http://www.w3.org/1998/Math/MathML",
			'xmlns:form':         "urn:oasis:names:tc:opendocument:xmlns:form:1.0",
			'xmlns:script':       "urn:oasis:names:tc:opendocument:xmlns:script:1.0",
			'xmlns:ooo':          "http://openoffice.org/2004/office",
			'xmlns:ooow':         "http://openoffice.org/2004/writer",
			'xmlns:oooc':         "http://openoffice.org/2004/calc",
			'xmlns:dom':          "http://www.w3.org/2001/xml-events",
			'xmlns:xforms':       "http://www.w3.org/2002/xforms",
			'xmlns:xsd':          "http://www.w3.org/2001/XMLSchema",
			'xmlns:xsi':          "http://www.w3.org/2001/XMLSchema-instance",
			'xmlns:sheet':        "urn:oasis:names:tc:opendocument:sh33tjs:1.0",
			'xmlns:rpt':          "http://openoffice.org/2005/report",
			'xmlns:of':           "urn:oasis:names:tc:opendocument:xmlns:of:1.2",
			'xmlns:xhtml':        "http://www.w3.org/1999/xhtml",
			'xmlns:grddl':        "http://www.w3.org/2003/g/data-view#",
			'xmlns:tableooo':     "http://openoffice.org/2009/table",
			'xmlns:drawooo':      "http://openoffice.org/2010/draw",
			'xmlns:calcext':      "urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0",
			'xmlns:loext':        "urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0",
			'xmlns:field':        "urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0",
			'xmlns:formx':        "urn:openoffice:names:experimental:ooxml-odf-interop:xmlns:form:1.0",
			'xmlns:css3t':        "http://www.w3.org/TR/css3-text/",
			'office:version':     "1.2"
		});

		var fods = wxt_helper({
			'xmlns:config':    "urn:oasis:names:tc:opendocument:xmlns:config:1.0",
			'office:mimetype': "application/vnd.oasis.opendocument.spreadsheet"
		});

		if(opts.bookType == "fods") {
			o.push('<office:document' + attr + fods + '>\n');
			o.push(write_meta_ods().replace(/<office:document-meta[^<>]*?>/, "").replace(/<\/office:document-meta>/, "") + "\n");
			// TODO: settings (equiv of settings.xml for ODS)
		} else o.push('<office:document-content' + attr  + '>\n');
		// o.push('  <office:scripts/>\n');
		var nfs = write_automatic_styles_ods(o, wb);
		o.push('  <office:body>\n');
		o.push('    <office:spreadsheet>\n');
		if(((wb.Workbook||{}).WBProps||{}).date1904) o.push('      <table:calculation-settings table:case-sensitive="false" table:search-criteria-must-apply-to-whole-cell="true" table:use-wildcards="true" table:use-regular-expressions="false" table:automatic-find-labels="false">\n        <table:null-date table:date-value="1904-01-01"/>\n      </table:calculation-settings>\n');
		for(var i = 0; i != wb.SheetNames.length; ++i) o.push(write_ws(wb.Sheets[wb.SheetNames[i]], wb, i, opts, nfs, ((wb.Workbook||{}).WBProps||{}).date1904));
		if((wb.Workbook||{}).Names) o.push(write_names_ods(wb.Workbook.Names, wb.SheetNames, -1));
		o.push('    </office:spreadsheet>\n');
		o.push('  </office:body>\n');
		if(opts.bookType == "fods") o.push('</office:document>');
		else o.push('</office:document-content>');
		return o.join("");
	};
})();

function write_ods(wb/*:any*/, opts/*:any*/) {
	if(opts.bookType == "fods") return write_content_ods(wb, opts);

	var zip = zip_new();
	var f = "";

	var manifest/*:Array<Array<string> >*/ = [];
	var rdf/*:Array<[string, string]>*/ = [];

	/* Part 3 Section 3.3 MIME Media Type */
	f = "mimetype";
	zip_add_file(zip, f, "application/vnd.oasis.opendocument.spreadsheet");

	/* Part 1 Section 2.2 Documents */
	f = "content.xml";
	zip_add_file(zip, f, write_content_ods(wb, opts));
	manifest.push([f, "text/xml"]);
	rdf.push([f, "ContentFile"]);

	/* TODO: these are hard-coded styles to satiate excel */
	f = "styles.xml";
	zip_add_file(zip, f, write_styles_ods(wb, opts));
	manifest.push([f, "text/xml"]);
	rdf.push([f, "StylesFile"]);

	/* TODO: this is hard-coded to satiate excel */
	f = "meta.xml";
	zip_add_file(zip, f, XML_HEADER + write_meta_ods(/*::wb, opts*/));
	manifest.push([f, "text/xml"]);
	rdf.push([f, "MetadataFile"]);

	/* Part 3 Section 6 Metadata Manifest File */
	f = "manifest.rdf";
	zip_add_file(zip, f, write_rdf(rdf/*, opts*/));
	manifest.push([f, "application/rdf+xml"]);

	/* Part 3 Section 4 Manifest File */
	f = "META-INF/manifest.xml";
	zip_add_file(zip, f, write_manifest(manifest/*, opts*/));

	return zip;
}

function fix_opts_func(defaults/*:Array<Array<any> >*/)/*:{(o:any):void}*/ {
	return function fix_opts(opts) {
		for(var i = 0; i != defaults.length; ++i) {
			var d = defaults[i];
			if(opts[d[0]] === undefined) opts[d[0]] = d[1];
			if(d[2] === 'n') opts[d[0]] = Number(opts[d[0]]);
		}
	};
}

function fix_read_opts(opts) {
fix_opts_func([
	['cellNF', false], /* emit cell number format string as .z */
	['cellHTML', true], /* emit html string as .h */
	['cellFormula', true], /* emit formulae as .f */
	['cellStyles', false], /* emits style/theme as .s */
	['cellText', true], /* emit formatted text as .w */
	['cellDates', false], /* emit date cells with type `d` */

	['sheetStubs', false], /* emit empty cells */
	['sheetRows', 0, 'n'], /* read n rows (0 = read all rows) */

	['bookDeps', false], /* parse calculation chains */
	['bookSheets', false], /* only try to get sheet names (no Sheets) */
	['bookProps', false], /* only try to get properties (no Sheets) */
	['bookFiles', false], /* include raw file structure (keys, files, cfb) */
	['bookVBA', false], /* include vba raw data (vbaraw) */

	['password',''], /* password */
	['WTF', false] /* WTF mode (throws errors) */
])(opts);
}

function fix_write_opts(opts) {
fix_opts_func([
	['cellDates', false], /* write date cells with type `d` */

	['bookSST', false], /* Generate Shared String Table */

	['bookType', 'xlsx'], /* Type of workbook (xlsx/m/b) */

	['compression', false], /* Use file compression */

	['WTF', false] /* WTF mode (throws errors) */
])(opts);
}
function get_sheet_type(n/*:string*/)/*:string*/ {
	if(RELS.WS.indexOf(n) > -1) return "sheet";
	if(RELS.CS && n == RELS.CS) return "chart";
	if(RELS.DS && n == RELS.DS) return "dialog";
	if(RELS.MS && n == RELS.MS) return "macro";
	return (n && n.length) ? n : "sheet";
}
function safe_parse_wbrels(wbrels, sheets) {
	if(!wbrels) return 0;
	try {
		wbrels = sheets.map(function pwbr(w) { if(!w.id) w.id = w.strRelID; return [w.name, wbrels['!id'][w.id].Target, get_sheet_type(wbrels['!id'][w.id].Type)]; });
	} catch(e) { return null; }
	return !wbrels || wbrels.length === 0 ? null : wbrels;
}

function parse_sheet_legacy_drawing(sheet, type, zip, path, idx, opts, wb, comments) {
	if(!sheet || !sheet['!legdrawel']) return;
	var dfile = resolve_path(sheet['!legdrawel'].Target, path);
	var draw = getzipstr(zip, dfile, true);
	if(draw) parse_vml(utf8read(draw), sheet, comments||[]);
}

function safe_parse_sheet(zip, path/*:string*/, relsPath/*:string*/, sheet, idx/*:number*/, sheetRels, sheets, stype/*:string*/, opts, wb, themes, styles) {
	try {
		sheetRels[sheet]=parse_rels(getzipstr(zip, relsPath, true), path);
		var data = getzipdata(zip, path);
		var _ws;
		switch(stype) {
			case 'sheet':  _ws = parse_ws(data, path, idx, opts, sheetRels[sheet], wb, themes, styles); break;
			case 'chart':  _ws = parse_cs(data, path, idx, opts, sheetRels[sheet], wb, themes, styles);
				if(!_ws || !_ws['!drawel']) break;
				var dfile = resolve_path(_ws['!drawel'].Target, path);
				var drelsp = get_rels_path(dfile);
				var draw = parse_drawing(getzipstr(zip, dfile, true), parse_rels(getzipstr(zip, drelsp, true), dfile));
				var chartp = resolve_path(draw, dfile);
				var crelsp = get_rels_path(chartp);
				_ws = parse_chart(getzipstr(zip, chartp, true), chartp, opts, parse_rels(getzipstr(zip, crelsp, true), chartp), wb, _ws);
				break;
			case 'macro':  _ws = parse_ms(data, path, idx, opts, sheetRels[sheet], wb, themes, styles); break;
			case 'dialog': _ws = parse_ds(data, path, idx, opts, sheetRels[sheet], wb, themes, styles); break;
			default: throw new Error("Unrecognized sheet type " + stype);
		}
		sheets[sheet] = _ws;

		/* scan rels for comments and threaded comments */
		var comments = [], tcomments = [];
		if(sheetRels && sheetRels[sheet]) keys(sheetRels[sheet]).forEach(function(n) {
			var dfile = "";
			if(sheetRels[sheet][n].Type == RELS.CMNT) {
				dfile = resolve_path(sheetRels[sheet][n].Target, path);
				comments = parse_cmnt(getzipdata(zip, dfile, true), dfile, opts);
				if(!comments || !comments.length) return;
				sheet_insert_comments(_ws, comments, false);
			}
			if(sheetRels[sheet][n].Type == RELS.TCMNT) {
				dfile = resolve_path(sheetRels[sheet][n].Target, path);
				tcomments = tcomments.concat(parse_tcmnt_xml(getzipdata(zip, dfile, true), opts));
			}
		});
		if(tcomments && tcomments.length) sheet_insert_comments(_ws, tcomments, true, opts.people || []);
		parse_sheet_legacy_drawing(_ws, stype, zip, path, idx, opts, wb, comments);
	} catch(e) { if(opts.WTF) throw e; }
}

function strip_front_slash(x/*:string*/)/*:string*/ { return x.charAt(0) == '/' ? x.slice(1) : x; }

function parse_zip(zip/*:ZIP*/, opts/*:?ParseOpts*/)/*:Workbook*/ {
	make_ssf();
	opts = opts || {};
	fix_read_opts(opts);

	/* OpenDocument Part 3 Section 2.2.1 OpenDocument Package */
	if(safegetzipfile(zip, 'META-INF/manifest.xml')) return parse_ods(zip, opts);
	/* UOC */
	if(safegetzipfile(zip, 'objectdata.xml')) return parse_ods(zip, opts);
	/* Numbers */
	if(safegetzipfile(zip, 'Index/Document.iwa')) {
		if(typeof Uint8Array == "undefined") throw new Error('NUMBERS file parsing requires Uint8Array support');
		if(typeof parse_numbers_iwa != "undefined") {
			if(zip.FileIndex) return parse_numbers_iwa(zip, opts);
			var _zip = CFB.utils.cfb_new();
			zipentries(zip).forEach(function(e) { zip_add_file(_zip, e, getzipbin(zip, e)); });
			return parse_numbers_iwa(_zip, opts);
		}
		throw new Error('Unsupported NUMBERS file');
	}
	if(!safegetzipfile(zip, '[Content_Types].xml')) {
		if(safegetzipfile(zip, 'index.xml.gz')) throw new Error('Unsupported NUMBERS 08 file');
		if(safegetzipfile(zip, 'index.xml')) throw new Error('Unsupported NUMBERS 09 file');
		var index_zip = CFB.find(zip, 'Index.zip');
		if(index_zip) {
			opts = dup(opts);
			delete opts.type;
			if(typeof index_zip.content == "string") opts.type = "binary";
			// TODO: Bun buffer bug
			if(typeof Bun !== "undefined" && Buffer.isBuffer(index_zip.content)) return readSync(new Uint8Array(index_zip.content), opts);
			return readSync(index_zip.content, opts);
		}
		throw new Error('Unsupported ZIP file');
	}

	var entries = zipentries(zip);
	var dir = parse_ct((getzipstr(zip, '[Content_Types].xml')/*:?any*/));
	var xlsb = false;
	var sheets, binname;
	if(dir.workbooks.length === 0) {
		binname = "xl/workbook.xml";
		if(getzipdata(zip,binname, true)) dir.workbooks.push(binname);
	}
	if(dir.workbooks.length === 0) {
		binname = "xl/workbook.bin";
		if(!getzipdata(zip,binname,true)) throw new Error("Could not find workbook");
		dir.workbooks.push(binname);
		xlsb = true;
	}
	if(dir.workbooks[0].slice(-3) == "bin") xlsb = true;

	var themes = ({}/*:any*/);
	var styles = ({}/*:any*/);
	if(!opts.bookSheets && !opts.bookProps) {
		strs = [];
		if(dir.sst) try { strs=parse_sst(getzipdata(zip, strip_front_slash(dir.sst)), dir.sst, opts); } catch(e) { if(opts.WTF) throw e; }

		if(opts.cellStyles && dir.themes.length) themes = parse_theme_xml(getzipstr(zip, dir.themes[0].replace(/^\//,''), true)||"", opts);

		if(dir.style) styles = parse_sty(getzipdata(zip, strip_front_slash(dir.style)), dir.style, themes, opts);
	}

	/*var externbooks = */dir.links.map(function(link) {
		try {
			var rels = parse_rels(getzipstr(zip, get_rels_path(strip_front_slash(link))), link);
			return parse_xlink(getzipdata(zip, strip_front_slash(link)), rels, link, opts);
		} catch(e) {}
	});

	var wb = parse_wb(getzipdata(zip, strip_front_slash(dir.workbooks[0])), dir.workbooks[0], opts);

	var props = {}, propdata = "";

	if(dir.coreprops.length) {
		propdata = getzipdata(zip, strip_front_slash(dir.coreprops[0]), true);
		if(propdata) props = parse_core_props(propdata);
		if(dir.extprops.length !== 0) {
			propdata = getzipdata(zip, strip_front_slash(dir.extprops[0]), true);
			if(propdata) parse_ext_props(propdata, props, opts);
		}
	}

	var custprops = {};
	if(!opts.bookSheets || opts.bookProps) {
		if (dir.custprops.length !== 0) {
			propdata = getzipstr(zip, strip_front_slash(dir.custprops[0]), true);
			if(propdata) custprops = parse_cust_props(propdata, opts);
		}
	}

	var out = ({}/*:any*/);
	if(opts.bookSheets || opts.bookProps) {
		if(wb.Sheets) sheets = wb.Sheets.map(function pluck(x){ return x.name; });
		else if(props.Worksheets && props.SheetNames.length > 0) sheets=props.SheetNames;
		if(opts.bookProps) { out.Props = props; out.Custprops = custprops; }
		if(opts.bookSheets && typeof sheets !== 'undefined') out.SheetNames = sheets;
		if(opts.bookSheets ? out.SheetNames : opts.bookProps) return out;
	}
	sheets = {};

	var deps = {};
	if(opts.bookDeps && dir.calcchain) deps=parse_cc(getzipdata(zip, strip_front_slash(dir.calcchain)),dir.calcchain,opts);

	var i=0;
	var sheetRels = ({}/*:any*/);
	var path, relsPath;

	{
		var wbsheets = wb.Sheets;
		props.Worksheets = wbsheets.length;
		props.SheetNames = [];
		for(var j = 0; j != wbsheets.length; ++j) {
			props.SheetNames[j] = wbsheets[j].name;
		}
	}

	var wbext = xlsb ? "bin" : "xml";
	var wbrelsi = dir.workbooks[0].lastIndexOf("/");
	var wbrelsfile = (dir.workbooks[0].slice(0, wbrelsi+1) + "_rels/" + dir.workbooks[0].slice(wbrelsi+1) + ".rels").replace(/^\//,"");
	if(!safegetzipfile(zip, wbrelsfile)) wbrelsfile = 'xl/_rels/workbook.' + wbext + '.rels';
	var wbrels = parse_rels(getzipstr(zip, wbrelsfile, true), wbrelsfile.replace(/_rels.*/, "s5s"));

	if((dir.metadata || []).length >= 1) {
		/* TODO: MDX and other types of metadata */
		opts.xlmeta = parse_xlmeta(getzipdata(zip, strip_front_slash(dir.metadata[0])),dir.metadata[0],opts);
	}

	if((dir.people || []).length >= 1) {
		opts.people = parse_people_xml(getzipdata(zip, strip_front_slash(dir.people[0])),opts);
	}

	if(wbrels) wbrels = safe_parse_wbrels(wbrels, wb.Sheets);

	/* Numbers iOS hack */
	var nmode = (getzipdata(zip,"xl/worksheets/sheet.xml",true))?1:0;
	wsloop: for(i = 0; i != props.Worksheets; ++i) {
		var stype = "sheet";
		if(wbrels && wbrels[i]) {
			path = 'xl/' + (wbrels[i][1]).replace(/[\/]?xl\//, "");
			if(!safegetzipfile(zip, path)) path = wbrels[i][1];
			if(!safegetzipfile(zip, path)) path = wbrelsfile.replace(/_rels\/[\S\s]*$/,"") + wbrels[i][1];
			stype = wbrels[i][2];
		} else {
			path = 'xl/worksheets/sheet'+(i+1-nmode)+"." + wbext;
			path = path.replace(/sheet0\./,"sheet.");
		}
		relsPath = path.replace(/^(.*)(\/)([^\/]*)$/, "$1/_rels/$3.rels");
		if(opts && opts.sheets != null) switch(typeof opts.sheets) {
			case "number": if(i != opts.sheets) continue wsloop; break;
			case "string": if(props.SheetNames[i].toLowerCase() != opts.sheets.toLowerCase()) continue wsloop; break;
			default: if(Array.isArray && Array.isArray(opts.sheets)) {
				var snjseen = false;
				for(var snj = 0; snj != opts.sheets.length; ++snj) {
					if(typeof opts.sheets[snj] == "number" && opts.sheets[snj] == i) snjseen=1;
					if(typeof opts.sheets[snj] == "string" && opts.sheets[snj].toLowerCase() == props.SheetNames[i].toLowerCase()) snjseen = 1;
				}
				if(!snjseen) continue wsloop;
			}
		}
		safe_parse_sheet(zip, path, relsPath, props.SheetNames[i], i, sheetRels, sheets, stype, opts, wb, themes, styles);
	}

	out = ({
		Directory: dir,
		Workbook: wb,
		Props: props,
		Custprops: custprops,
		Deps: deps,
		Sheets: sheets,
		SheetNames: props.SheetNames,
		Strings: strs,
		Styles: styles,
		Themes: themes,
		SSF: dup(table_fmt)
	}/*:any*/);
	if(opts && opts.bookFiles) {
		if(zip.files) {
			out.keys = entries;
			out.files = zip.files;
		} else {
			out.keys = [];
			out.files = {};
			zip.FullPaths.forEach(function(p, idx) {
				p = p.replace(/^Root Entry[\/]/, "");
				out.keys.push(p);
				out.files[p] = zip.FileIndex[idx];
			});
		}
	}
	if(opts && opts.bookVBA) {
		if(dir.vba.length > 0) out.vbaraw = getzipdata(zip,strip_front_slash(dir.vba[0]),true);
		else if(dir.defaults && dir.defaults.bin === CT_VBA) out.vbaraw = getzipdata(zip, 'xl/vbaProject.bin',true);
	}
	// TODO: pass back content types metadata for xlsm/xlsx resolution
	out.bookType = xlsb ? "xlsb" : "xlsx";
	return out;
}

/* [MS-OFFCRYPTO] 2.1.1 */
function parse_xlsxcfb(cfb, _opts/*:?ParseOpts*/)/*:Workbook*/ {
	var opts = _opts || {};
	var f = 'Workbook', data = CFB.find(cfb, f);
	try {
	f = '/!DataSpaces/Version';
	data = CFB.find(cfb, f); if(!data || !data.content) throw new Error("ECMA-376 Encrypted file missing " + f);
	/*var version = */parse_DataSpaceVersionInfo(data.content);

	/* 2.3.4.1 */
	f = '/!DataSpaces/DataSpaceMap';
	data = CFB.find(cfb, f); if(!data || !data.content) throw new Error("ECMA-376 Encrypted file missing " + f);
	var dsm = parse_DataSpaceMap(data.content);
	if(dsm.length !== 1 || dsm[0].comps.length !== 1 || dsm[0].comps[0].t !== 0 || dsm[0].name !== "StrongEncryptionDataSpace" || dsm[0].comps[0].v !== "EncryptedPackage")
		throw new Error("ECMA-376 Encrypted file bad " + f);

	/* 2.3.4.2 */
	f = '/!DataSpaces/DataSpaceInfo/StrongEncryptionDataSpace';
	data = CFB.find(cfb, f); if(!data || !data.content) throw new Error("ECMA-376 Encrypted file missing " + f);
	var seds = parse_DataSpaceDefinition(data.content);
	if(seds.length != 1 || seds[0] != "StrongEncryptionTransform")
		throw new Error("ECMA-376 Encrypted file bad " + f);

	/* 2.3.4.3 */
	f = '/!DataSpaces/TransformInfo/StrongEncryptionTransform/!Primary';
	data = CFB.find(cfb, f); if(!data || !data.content) throw new Error("ECMA-376 Encrypted file missing " + f);
	/*var hdr = */parse_Primary(data.content);
	} catch(e) {}

	f = '/EncryptionInfo';
	data = CFB.find(cfb, f); if(!data || !data.content) throw new Error("ECMA-376 Encrypted file missing " + f);
	var einfo = parse_EncryptionInfo(data.content);

	/* 2.3.4.4 */
	f = '/EncryptedPackage';
	data = CFB.find(cfb, f); if(!data || !data.content) throw new Error("ECMA-376 Encrypted file missing " + f);

/*global decrypt_agile */
/*:: declare var decrypt_agile:any; */
	if(einfo[0] == 0x04 && typeof decrypt_agile !== 'undefined') return decrypt_agile(einfo[1], data.content, opts.password || "", opts);
/*global decrypt_std76 */
/*:: declare var decrypt_std76:any; */
	if(einfo[0] == 0x02 && typeof decrypt_std76 !== 'undefined') return decrypt_std76(einfo[1], data.content, opts.password || "", opts);
	throw new Error("File is password-protected");
}

function write_zip_xlsb(wb/*:Workbook*/, opts/*:WriteOpts*/)/*:ZIP*/ {
	if(wb && !wb.SSF) {
		wb.SSF = dup(table_fmt);
	}
	if(wb && wb.SSF) {
		make_ssf(); SSF_load_table(wb.SSF);
		// $FlowIgnore
		opts.revssf = evert_num(wb.SSF); opts.revssf[wb.SSF[65535]] = 0;
		opts.ssf = wb.SSF;
	}
	opts.rels = {}; opts.wbrels = {};
	opts.Strings = /*::((*/[]/*:: :any):SST)*/; opts.Strings.Count = 0; opts.Strings.Unique = 0;
	if(browser_has_Map) opts.revStrings = new Map();
	else { opts.revStrings = {}; opts.revStrings.foo = []; delete opts.revStrings.foo; }
	var wbext = "bin";
	var vbafmt = true;
	var ct = new_ct();
	fix_write_opts(opts = opts || {});
	var zip = zip_new();
	var f = "", rId = 0;

	opts.cellXfs = [];
	get_cell_style(opts.cellXfs, {}, {revssf:{"General":0}});

	if(!wb.Props) wb.Props = {};

	f = "docProps/core.xml";
	zip_add_file(zip, f, write_core_props(wb.Props, opts));
	ct.coreprops.push(f);
	add_rels(opts.rels, 2, f, RELS.CORE_PROPS);

	/*::if(!wb.Props) throw "unreachable"; */
	f = "docProps/app.xml";
	if(wb.Props && wb.Props.SheetNames){/* empty */}
	else if(!wb.Workbook || !wb.Workbook.Sheets) wb.Props.SheetNames = wb.SheetNames;
	else {
		var _sn = [];
		for(var _i = 0; _i < wb.SheetNames.length; ++_i)
			if((wb.Workbook.Sheets[_i]||{}).Hidden != 2) _sn.push(wb.SheetNames[_i]);
		wb.Props.SheetNames = _sn;
	}
	wb.Props.Worksheets = wb.Props.SheetNames.length;
	zip_add_file(zip, f, write_ext_props(wb.Props, opts));
	ct.extprops.push(f);
	add_rels(opts.rels, 3, f, RELS.EXT_PROPS);

	if(wb.Custprops !== wb.Props && keys(wb.Custprops||{}).length > 0) {
		f = "docProps/custom.xml";
		zip_add_file(zip, f, write_cust_props(wb.Custprops, opts));
		ct.custprops.push(f);
		add_rels(opts.rels, 4, f, RELS.CUST_PROPS);
	}

	var people = ["SheetJ5"];
	opts.tcid = 0;

	for(rId=1;rId <= wb.SheetNames.length; ++rId) {
		var wsrels = {'!id':{}};
		var ws = wb.Sheets[wb.SheetNames[rId-1]];
		var _type = (ws || {})["!type"] || "sheet";
		switch(_type) {
		case "chart":
			/* falls through */
		default:
			f = "xl/worksheets/sheet" + rId + "." + wbext;
			zip_add_file(zip, f, write_ws_bin(rId-1, opts, wb, wsrels));
			ct.sheets.push(f);
			add_rels(opts.wbrels, -1, "worksheets/sheet" + rId + "." + wbext, RELS.WS[0]);
		}

		if(ws) {
			var comments = ws['!comments'];
			var need_vml = false;
			var cf = "";
			if(comments && comments.length > 0) {
				var needtc = false;
				comments.forEach(function(carr) {
					carr[1].forEach(function(c) { if(c.T == true) needtc = true; });
				});
				if(needtc) {
					cf = "xl/threadedComments/threadedComment" + rId + ".xml";
					zip_add_file(zip, cf, write_tcmnt_xml(comments, people, opts));
					ct.threadedcomments.push(cf);
					add_rels(wsrels, -1, "../threadedComments/threadedComment" + rId + ".xml", RELS.TCMNT);
				}

				cf = "xl/comments" + rId + "." + wbext;
				zip_add_file(zip, cf, write_comments_bin(comments, opts));
				ct.comments.push(cf);
				add_rels(wsrels, -1, "../comments" + rId + "." + wbext, RELS.CMNT);
				need_vml = true;
			}
			if(ws['!legacy']) {
				if(need_vml) zip_add_file(zip, "xl/drawings/vmlDrawing" + (rId) + ".vml", write_vml(rId, ws['!comments']));
			}
			delete ws['!comments'];
			delete ws['!legacy'];
		}

		if(wsrels['!id'].rId1) zip_add_file(zip, get_rels_path(f), write_rels(wsrels));
	}

	if(opts.Strings != null && opts.Strings.length > 0) {
		f = "xl/sharedStrings." + wbext;
		zip_add_file(zip, f, write_sst_bin(opts.Strings, opts));
		ct.strs.push(f);
		add_rels(opts.wbrels, -1, "sharedStrings." + wbext, RELS.SST);
	}

	f = "xl/workbook." + wbext;
	zip_add_file(zip, f, write_wb_bin(wb, opts));
	ct.workbooks.push(f);
	add_rels(opts.rels, 1, f, RELS.WB);

	/* TODO: something more intelligent with themes */

	f = "xl/theme/theme1.xml";
	var ww = write_theme(wb.Themes, opts);
	zip_add_file(zip, f, ww);
	ct.themes.push(f);
	add_rels(opts.wbrels, -1, "theme/theme1.xml", RELS.THEME);

	/* TODO: something more intelligent with styles */

	f = "xl/styles." + wbext;
	zip_add_file(zip, f, write_sty_bin(wb, opts));
	ct.styles.push(f);
	add_rels(opts.wbrels, -1, "styles." + wbext, RELS.STY);

	if(wb.vbaraw && vbafmt) {
		f = "xl/vbaProject.bin";
		zip_add_file(zip, f, wb.vbaraw);
		ct.vba.push(f);
		add_rels(opts.wbrels, -1, "vbaProject.bin", RELS.VBA);
	}

	f = "xl/metadata." + wbext;
	zip_add_file(zip, f, write_xlmeta_bin());
	ct.metadata.push(f);
	add_rels(opts.wbrels, -1, "metadata." + wbext, RELS.XLMETA);

	if(people.length > 1) {
		f = "xl/persons/person.xml";
		zip_add_file(zip, f, write_people_xml(people, opts));
		ct.people.push(f);
		add_rels(opts.wbrels, -1, "persons/person.xml", RELS.PEOPLE);
	}

	zip_add_file(zip, "[Content_Types].xml", write_ct(ct, opts));
	zip_add_file(zip, '_rels/.rels', write_rels(opts.rels));
	zip_add_file(zip, 'xl/_rels/workbook.' + wbext + '.rels', write_rels(opts.wbrels));

	delete opts.revssf; delete opts.ssf;
	return zip;
}

function write_zip_xlsx(wb/*:Workbook*/, opts/*:WriteOpts*/)/*:ZIP*/ {
	if(wb && !wb.SSF) {
		wb.SSF = dup(table_fmt);
	}
	if(wb && wb.SSF) {
		make_ssf(); SSF_load_table(wb.SSF);
		// $FlowIgnore
		opts.revssf = evert_num(wb.SSF); opts.revssf[wb.SSF[65535]] = 0;
		opts.ssf = wb.SSF;
	}
	opts.rels = {}; opts.wbrels = {};
	opts.Strings = /*::((*/[]/*:: :any):SST)*/; opts.Strings.Count = 0; opts.Strings.Unique = 0;
	if(browser_has_Map) opts.revStrings = new Map();
	else { opts.revStrings = {}; opts.revStrings.foo = []; delete opts.revStrings.foo; }
	var wbext = "xml";
	var vbafmt = VBAFMTS.indexOf(opts.bookType) > -1;
	var ct = new_ct();
	fix_write_opts(opts = opts || {});
	var zip = zip_new();
	var f = "", rId = 0;

	opts.cellXfs = [];
	get_cell_style(opts.cellXfs, {}, {revssf:{"General":0}});

	if(!wb.Props) wb.Props = {};

	f = "docProps/core.xml";
	zip_add_file(zip, f, write_core_props(wb.Props, opts));
	ct.coreprops.push(f);
	add_rels(opts.rels, 2, f, RELS.CORE_PROPS);

	/*::if(!wb.Props) throw "unreachable"; */
	f = "docProps/app.xml";
	if(wb.Props && wb.Props.SheetNames){/* empty */}
	else if(!wb.Workbook || !wb.Workbook.Sheets) wb.Props.SheetNames = wb.SheetNames;
	else {
		var _sn = [];
		for(var _i = 0; _i < wb.SheetNames.length; ++_i)
			if((wb.Workbook.Sheets[_i]||{}).Hidden != 2) _sn.push(wb.SheetNames[_i]);
		wb.Props.SheetNames = _sn;
	}
	wb.Props.Worksheets = wb.Props.SheetNames.length;
	zip_add_file(zip, f, write_ext_props(wb.Props, opts));
	ct.extprops.push(f);
	add_rels(opts.rels, 3, f, RELS.EXT_PROPS);

	if(wb.Custprops !== wb.Props && keys(wb.Custprops||{}).length > 0) {
		f = "docProps/custom.xml";
		zip_add_file(zip, f, write_cust_props(wb.Custprops, opts));
		ct.custprops.push(f);
		add_rels(opts.rels, 4, f, RELS.CUST_PROPS);
	}

	var people = ["SheetJ5"];
	opts.tcid = 0;

	for(rId=1;rId <= wb.SheetNames.length; ++rId) {
		var wsrels = {'!id':{}};
		var ws = wb.Sheets[wb.SheetNames[rId-1]];
		var _type = (ws || {})["!type"] || "sheet";
		switch(_type) {
		case "chart":
			/* falls through */
		default:
			f = "xl/worksheets/sheet" + rId + "." + wbext;
			zip_add_file(zip, f, write_ws_xml(rId-1, opts, wb, wsrels));
			ct.sheets.push(f);
			add_rels(opts.wbrels, -1, "worksheets/sheet" + rId + "." + wbext, RELS.WS[0]);
		}

		if(ws) {
			var comments = ws['!comments'];
			var need_vml = false;
			var cf = "";
			if(comments && comments.length > 0) {
				var needtc = false;
				comments.forEach(function(carr) {
					carr[1].forEach(function(c) { if(c.T == true) needtc = true; });
				});
				if(needtc) {
					cf = "xl/threadedComments/threadedComment" + rId + ".xml";
					zip_add_file(zip, cf, write_tcmnt_xml(comments, people, opts));
					ct.threadedcomments.push(cf);
					add_rels(wsrels, -1, "../threadedComments/threadedComment" + rId + ".xml", RELS.TCMNT);
				}

				cf = "xl/comments" + rId + "." + wbext;
				zip_add_file(zip, cf, write_comments_xml(comments, opts));
				ct.comments.push(cf);
				add_rels(wsrels, -1, "../comments" + rId + "." + wbext, RELS.CMNT);
				need_vml = true;
			}
			if(ws['!legacy']) {
				if(need_vml) zip_add_file(zip, "xl/drawings/vmlDrawing" + (rId) + ".vml", write_vml(rId, ws['!comments']));
			}
			delete ws['!comments'];
			delete ws['!legacy'];
		}

		if(wsrels['!id'].rId1) zip_add_file(zip, get_rels_path(f), write_rels(wsrels));
	}

	if(opts.Strings != null && opts.Strings.length > 0) {
		f = "xl/sharedStrings." + wbext;
		zip_add_file(zip, f, write_sst_xml(opts.Strings, opts));
		ct.strs.push(f);
		add_rels(opts.wbrels, -1, "sharedStrings." + wbext, RELS.SST);
	}

	f = "xl/workbook." + wbext;
	zip_add_file(zip, f, write_wb_xml(wb, opts));
	ct.workbooks.push(f);
	add_rels(opts.rels, 1, f, RELS.WB);

	/* TODO: something more intelligent with themes */

	f = "xl/theme/theme1.xml";
	zip_add_file(zip, f, write_theme(wb.Themes, opts));
	ct.themes.push(f);
	add_rels(opts.wbrels, -1, "theme/theme1.xml", RELS.THEME);

	/* TODO: something more intelligent with styles */

	f = "xl/styles." + wbext;
	zip_add_file(zip, f, write_sty_xml(wb, opts));
	ct.styles.push(f);
	add_rels(opts.wbrels, -1, "styles." + wbext, RELS.STY);

	if(wb.vbaraw && vbafmt) {
		f = "xl/vbaProject.bin";
		zip_add_file(zip, f, wb.vbaraw);
		ct.vba.push(f);
		add_rels(opts.wbrels, -1, "vbaProject.bin", RELS.VBA);
	}

	f = "xl/metadata." + wbext;
	zip_add_file(zip, f, write_xlmeta_xml());
	ct.metadata.push(f);
	add_rels(opts.wbrels, -1, "metadata." + wbext, RELS.XLMETA);

	if(people.length > 1) {
		f = "xl/persons/person.xml";
		zip_add_file(zip, f, write_people_xml(people, opts));
		ct.people.push(f);
		add_rels(opts.wbrels, -1, "persons/person.xml", RELS.PEOPLE);
	}

	zip_add_file(zip, "[Content_Types].xml", write_ct(ct, opts));
	zip_add_file(zip, '_rels/.rels', write_rels(opts.rels));
	zip_add_file(zip, 'xl/_rels/workbook.' + wbext + '.rels', write_rels(opts.wbrels));

	delete opts.revssf; delete opts.ssf;
	return zip;
}

function firstbyte(f/*:RawData*/,o/*:?TypeOpts*/)/*:Array<number>*/ {
	var x = "";
	switch((o||{}).type || "base64") {
		case 'buffer': return [f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7]];
		case 'base64': x = Base64_decode(f.slice(0,12)); break;
		case 'binary': x = f; break;
		case 'array':  return [f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7]];
		default: throw new Error("Unrecognized type " + (o && o.type || "undefined"));
	}
	return [x.charCodeAt(0), x.charCodeAt(1), x.charCodeAt(2), x.charCodeAt(3), x.charCodeAt(4), x.charCodeAt(5), x.charCodeAt(6), x.charCodeAt(7)];
}

function read_cfb(cfb/*:CFBContainer*/, opts/*:?ParseOpts*/)/*:Workbook*/ {
	if(CFB.find(cfb, "EncryptedPackage")) return parse_xlsxcfb(cfb, opts);
	return parse_xlscfb(cfb, opts);
}

function read_zip(data/*:RawData*/, opts/*:?ParseOpts*/)/*:Workbook*/ {
	var zip, d = data;
	var o = opts||{};
	if(!o.type) o.type = (has_buf && Buffer.isBuffer(data)) ? "buffer" : "base64";
	zip = zip_read(d, o);
	return parse_zip(zip, o);
}

function read_plaintext(data/*:string*/, o/*:ParseOpts*/)/*:Workbook*/ {
	var i = 0;
	main: while(i < data.length) switch(data.charCodeAt(i)) {
		case 0x0A: case 0x0D: case 0x20: ++i; break;
		case 0x3C: return parse_xlml(data.slice(i),o);
		default: break main;
	}
	return PRN.to_workbook(data, o);
}

function read_plaintext_raw(data/*:RawData*/, o/*:ParseOpts*/)/*:Workbook*/ {
	var str = "", bytes = firstbyte(data, o);
	switch(o.type) {
		case 'base64': str = Base64_decode(data); break;
		case 'binary': str = data; break;
		case 'buffer': str = data.toString('binary'); break;
		case 'array': str = cc2str(data); break;
		default: throw new Error("Unrecognized type " + o.type);
	}
	if(bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) str = utf8read(str);
	o.type = "binary";
	return read_plaintext(str, o);
}

function read_utf16(data/*:RawData*/, o/*:ParseOpts*/)/*:Workbook*/ {
	var d = data;
	if(o.type == 'base64') d = Base64_decode(d);
	if(typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) d = new Uint8Array(data);
	d = typeof $cptable !== "undefined" ? $cptable.utils.decode(1200, d.slice(2), 'str') : (
		(has_buf && Buffer.isBuffer(data)) ? data.slice(2).toString("utf16le") :
		(typeof Uint8Array !== "undefined" && d instanceof Uint8Array) ? (
			typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le").decode(d.slice(2)) : utf16lereadu(d.slice(2))
		) : utf16leread(d.slice(2))
	);
	o.type = "binary";
	return read_plaintext(d, o);
}

function bstrify(data/*:string*/)/*:string*/ {
	return !data.match(/[^\x00-\x7F]/) ? data : utf8write(data);
}

function read_prn(data, d, o, str) {
	if(str) { o.type = "string"; return PRN.to_workbook(data, o); }
	return PRN.to_workbook(d, o);
}

function readSync(data/*:RawData*/, opts/*:?ParseOpts*/)/*:Workbook*/ {
	reset_cp();
	var o = opts||{};
	if(o.codepage && typeof $cptable === "undefined") console.error("Codepage tables are not loaded.  Non-ASCII characters may not give expected results");
	if(typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) return readSync(new Uint8Array(data), (o = dup(o), o.type = "array", o));
	if(typeof Uint8Array !== 'undefined' && data instanceof Uint8Array && !o.type) o.type = typeof Deno !== "undefined" ? "buffer" : "array";
	var d = data, n = [0,0,0,0], str = false;
	if(o.cellStyles) { o.cellNF = true; o.sheetStubs = true; }
	_ssfopts = {};
	if(o.dateNF) _ssfopts.dateNF = o.dateNF;
	if(!o.type) o.type = (has_buf && Buffer.isBuffer(data)) ? "buffer" : "base64";
	if(o.type == "file") { o.type = has_buf ? "buffer" : "binary"; d = read_binary(data); if(typeof Uint8Array !== 'undefined' && !has_buf) o.type = "array"; }
	if(o.type == "string") { str = true; o.type = "binary"; o.codepage = 65001; d = bstrify(data); }
	if(o.type == 'array' && typeof Uint8Array !== 'undefined' && data instanceof Uint8Array && typeof ArrayBuffer !== 'undefined') {
		// $FlowIgnore
		var ab=new ArrayBuffer(3), vu=new Uint8Array(ab); vu.foo="bar";
		// $FlowIgnore
		if(!vu.foo) {o=dup(o); o.type='array'; return readSync(ab2a(d), o);}
	}
	switch((n = firstbyte(d, o))[0]) {
		case 0xD0: if(n[1] === 0xCF && n[2] === 0x11 && n[3] === 0xE0 && n[4] === 0xA1 && n[5] === 0xB1 && n[6] === 0x1A && n[7] === 0xE1) return read_cfb(CFB.read(d, o), o); break;
		case 0x09: if(n[1] <= 0x08) return parse_xlscfb(d, o); break;
		case 0x3C: return parse_xlml(d, o);
		case 0x49:
			if(n[1] === 0x49 && n[2] === 0x2a && n[3] === 0x00) throw new Error("TIFF Image File is not a spreadsheet");
			if(n[1] === 0x44) return read_wb_ID(d, o);
			break;
		case 0x54: if(n[1] === 0x41 && n[2] === 0x42 && n[3] === 0x4C) return DIF.to_workbook(d, o); break;
		case 0x50: return (n[1] === 0x4B && n[2] < 0x09 && n[3] < 0x09) ? read_zip(d, o) : read_prn(data, d, o, str);
		case 0xEF: return n[3] === 0x3C ? parse_xlml(d, o) : read_prn(data, d, o, str);
		case 0xFF:
			if(n[1] === 0xFE) { return read_utf16(d, o); }
			else if(n[1] === 0x00 && n[2] === 0x02 && n[3] === 0x00) return WK_.to_workbook(d, o);
			break;
		case 0x00:
			if(n[1] === 0x00) {
				if(n[2] >= 0x02 && n[3] === 0x00) return WK_.to_workbook(d, o);
				if(n[2] === 0x00 && (n[3] === 0x08 || n[3] === 0x09)) return WK_.to_workbook(d, o);
			}
			break;
		case 0x03: case 0x83: case 0x8B: case 0x8C: return DBF.to_workbook(d, o);
		case 0x7B: if(n[1] === 0x5C && n[2] === 0x72 && n[3] === 0x74) return rtf_to_workbook(d, o); break;
		case 0x0A: case 0x0D: case 0x20: return read_plaintext_raw(d, o);
		case 0x89: if(n[1] === 0x50 && n[2] === 0x4E && n[3] === 0x47) throw new Error("PNG Image File is not a spreadsheet"); break;
		case 0x08: if(n[1] === 0xE7) throw new Error("Unsupported Multiplan 1.x file!"); break;
		case 0x0C:
			if(n[1] === 0xEC) throw new Error("Unsupported Multiplan 2.x file!");
			if(n[1] === 0xED) throw new Error("Unsupported Multiplan 3.x file!");
			break;
	}
	if(DBF_SUPPORTED_VERSIONS.indexOf(n[0]) > -1 && n[2] <= 12 && n[3] <= 31) return DBF.to_workbook(d, o);
	return read_prn(data, d, o, str);
}

function readFileSync(filename/*:string*/, opts/*:?ParseOpts*/)/*:Workbook*/ {
	var o = opts||{}; o.type = 'file';
	return readSync(filename, o);
}
function write_cfb_ctr(cfb/*:CFBContainer*/, o/*:WriteOpts*/)/*:any*/ {
	switch(o.type) {
		case "base64": case "binary": break;
		case "buffer": case "array": o.type = ""; break;
		case "file": return write_dl(o.file, CFB.write(cfb, {type:has_buf ? 'buffer' : ""}));
		case "string": throw new Error("'string' output type invalid for '" + o.bookType + "' files");
		default: throw new Error("Unrecognized type " + o.type);
	}
	return CFB.write(cfb, o);
}

function write_zip(wb/*:Workbook*/, opts/*:WriteOpts*/)/*:ZIP*/ {
	switch(opts.bookType) {
		case "ods": return write_ods(wb, opts);
		case "numbers": return write_numbers_iwa(wb, opts);
		case "xlsb": return write_zip_xlsb(wb, opts);
		default: return write_zip_xlsx(wb, opts);
	}
}

/*:: declare var encrypt_agile:any; */
function write_zip_type(wb/*:Workbook*/, opts/*:?WriteOpts*/)/*:any*/ {
	var o = dup(opts||{});
	var z = write_zip(wb, o);
	return write_zip_denouement(z, o);
}
function write_zip_typeXLSX(wb/*:Workbook*/, opts/*:?WriteOpts*/)/*:any*/ {
	var o = dup(opts||{});
	var z = write_zip_xlsx(wb, o);
	return write_zip_denouement(z, o);
}
function write_zip_denouement(z/*:any*/, o/*:?WriteOpts*/)/*:any*/ {
	var oopts = {};
	var ftype = has_buf ? "nodebuffer" : (typeof Uint8Array !== "undefined" ? "array" : "string");
	if(o.compression) oopts.compression = 'DEFLATE';
	if(o.password) oopts.type = ftype;
	else switch(o.type) {
		case "base64": oopts.type = "base64"; break;
		case "binary": oopts.type = "string"; break;
		case "string": throw new Error("'string' output type invalid for '" + o.bookType + "' files");
		case "buffer":
		case "file": oopts.type = ftype; break;
		default: throw new Error("Unrecognized type " + o.type);
	}
	var out = z.FullPaths ? CFB.write(z, {fileType:"zip", type: /*::(*/{"nodebuffer": "buffer", "string": "binary"}/*:: :any)*/[oopts.type] || oopts.type, compression: !!o.compression}) : z.generate(oopts);
	if(typeof Deno !== "undefined") {
		if(typeof out == "string") {
			if(o.type == "binary" || o.type == "base64") return out;
			out = new Uint8Array(s2ab(out));
		}
	}
/*jshint -W083 */
	if(o.password && typeof encrypt_agile !== 'undefined') return write_cfb_ctr(encrypt_agile(out, o.password), o); // eslint-disable-line no-undef
/*jshint +W083 */
	if(o.type === "file") return write_dl(o.file, out);
	return o.type == "string" ? utf8read(/*::(*/out/*:: :any)*/) : out;
}

function write_cfb_type(wb/*:Workbook*/, opts/*:?WriteOpts*/)/*:any*/ {
	var o = opts||{};
	var cfb/*:CFBContainer*/ = write_xlscfb(wb, o);
	return write_cfb_ctr(cfb, o);
}

function write_string_type(out/*:string*/, opts/*:WriteOpts*/, bom/*:?string*/)/*:any*/ {
	if(!bom) bom = "";
	var o = bom + out;
	switch(opts.type) {
		case "base64": return Base64_encode(utf8write(o));
		case "binary": return utf8write(o);
		case "string": return out;
		case "file": return write_dl(opts.file, o, 'utf8');
		case "buffer": {
			if(has_buf) return Buffer_from(o, 'utf8');
			else if(typeof TextEncoder !== "undefined") return new TextEncoder().encode(o);
			else return write_string_type(o, {type:'binary'}).split("").map(function(c) { return c.charCodeAt(0); });
		}
	}
	throw new Error("Unrecognized type " + opts.type);
}

function write_stxt_type(out/*:string*/, opts/*:WriteOpts*/)/*:any*/ {
	switch(opts.type) {
		case "base64": return Base64_encode_pass(out);
		case "binary": return out;
		case "string": return out; /* override in sheet_to_txt */
		case "file": return write_dl(opts.file, out, 'binary');
		case "buffer": {
			if(has_buf) return Buffer_from(out, 'binary');
			else return out.split("").map(function(c) { return c.charCodeAt(0); });
		}
	}
	throw new Error("Unrecognized type " + opts.type);
}

/* TODO: test consistency */
function write_binary_type(out, opts/*:WriteOpts*/)/*:any*/ {
	switch(opts.type) {
		case "string":
		case "base64":
		case "binary":
			var bstr = "";
			// $FlowIgnore
			for(var i = 0; i < out.length; ++i) bstr += String.fromCharCode(out[i]);
			return opts.type == 'base64' ? Base64_encode(bstr) : opts.type == 'string' ? utf8read(bstr) : bstr;
		case "file": return write_dl(opts.file, out);
		case "buffer": return out;
		default: throw new Error("Unrecognized type " + opts.type);
	}
}

function writeSyncXLSX(wb/*:Workbook*/, opts/*:?WriteOpts*/) {
	reset_cp();
	check_wb(wb);
	var o = dup(opts||{});
	if(o.cellStyles) { o.cellNF = true; o.sheetStubs = true; }
	if(o.type == "array") { o.type = "binary"; var out/*:string*/ = (writeSyncXLSX(wb, o)/*:any*/); o.type = "array"; return s2ab(out); }
	return write_zip_typeXLSX(wb, o);
}

function writeSync(wb/*:Workbook*/, opts/*:?WriteOpts*/) {
	reset_cp();
	check_wb(wb);
	var o = dup(opts||{});
	if(o.cellStyles) { o.cellNF = true; o.sheetStubs = true; }
	if(o.type == "array") { o.type = "binary"; var out/*:string*/ = (writeSync(wb, o)/*:any*/); o.type = "array"; return s2ab(out); }
	var idx = 0;
	if(o.sheet) {
		if(typeof o.sheet == "number") idx = o.sheet;
		else idx = wb.SheetNames.indexOf(o.sheet);
		if(!wb.SheetNames[idx]) throw new Error("Sheet not found: " + o.sheet + " : " + (typeof o.sheet));
	}
	switch(o.bookType || 'xlsb') {
		case 'xml':
		case 'xlml': return write_string_type(write_xlml(wb, o), o);
		case 'slk':
		case 'sylk': return write_string_type(SYLK.from_sheet(wb.Sheets[wb.SheetNames[idx]], o, wb), o);
		case 'htm':
		case 'html': return write_string_type(sheet_to_html(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'txt': return write_stxt_type(sheet_to_txt(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'csv': return write_string_type(sheet_to_csv(wb.Sheets[wb.SheetNames[idx]], o), o, "\ufeff");
		case 'dif': return write_string_type(DIF.from_sheet(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'dbf': return write_binary_type(DBF.from_sheet(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'prn': return write_string_type(PRN.from_sheet(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'rtf': return write_string_type(sheet_to_rtf(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'eth': return write_string_type(ETH.from_sheet(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'fods': return write_string_type(write_ods(wb, o), o);
		case 'wk1': return write_binary_type(WK_.sheet_to_wk1(wb.Sheets[wb.SheetNames[idx]], o), o);
		case 'wk3': return write_binary_type(WK_.book_to_wk3(wb, o), o);
		case 'biff2': if(!o.biff) o.biff = 2; /* falls through */
		case 'biff3': if(!o.biff) o.biff = 3; /* falls through */
		case 'biff4': if(!o.biff) o.biff = 4; return write_binary_type(write_biff_buf(wb, o), o);
		case 'biff5': if(!o.biff) o.biff = 5; /* falls through */
		case 'biff8':
		case 'xla':
		case 'xls': if(!o.biff) o.biff = 8; return write_cfb_type(wb, o);
		case 'xlsx':
		case 'xlsm':
		case 'xlam':
		case 'xlsb':
		case 'numbers':
		case 'ods': return write_zip_type(wb, o);
		default: throw new Error ("Unrecognized bookType |" + o.bookType + "|");
	}
}

function resolve_book_type(o/*:WriteFileOpts*/) {
	if(o.bookType) return;
	var _BT = {
		"xls": "biff8",
		"htm": "html",
		"slk": "sylk",
		"socialcalc": "eth",
		"Sh33tJS": "WTF"
	};
	var ext = o.file.slice(o.file.lastIndexOf(".")).toLowerCase();
	if(ext.match(/^\.[a-z]+$/)) o.bookType = ext.slice(1);
	o.bookType = _BT[o.bookType] || o.bookType;
}

function writeFileSync(wb/*:Workbook*/, filename/*:string*/, opts/*:?WriteFileOpts*/) {
	var o = opts||{}; o.type = 'file';
	o.file = filename;
	resolve_book_type(o);
	return writeSync(wb, o);
}

function writeFileSyncXLSX(wb/*:Workbook*/, filename/*:string*/, opts/*:?WriteFileOpts*/) {
	var o = opts||{}; o.type = 'file';
	o.file = filename;
	resolve_book_type(o);
	return writeSyncXLSX(wb, o);
}


function writeFileAsync(filename/*:string*/, wb/*:Workbook*/, opts/*:?WriteFileOpts*/, cb/*:?(e?:ErrnoError)=>void*/) {
	var o = opts||{}; o.type = 'file';
	o.file = filename;
	resolve_book_type(o);
	o.type = 'buffer';
	var _cb = cb; if(!(_cb instanceof Function)) _cb = (opts/*:any*/);
	return _fs.writeFile(filename, writeSync(wb, o), _cb);
}
/*::
type MJRObject = {
	row: any;
	isempty: boolean;
};
*/
function make_json_row(sheet/*:Worksheet*/, r/*:Range*/, R/*:number*/, cols/*:Array<string>*/, header/*:number*/, hdr/*:Array<any>*/, o/*:Sheet2JSONOpts*/)/*:MJRObject*/ {
	var rr = encode_row(R);
	var defval = o.defval, raw = o.raw || !Object.prototype.hasOwnProperty.call(o, "raw");
	var isempty = true, dense = (sheet["!data"] != null);
	var row/*:any*/ = (header === 1) ? [] : {};
	if(header !== 1) {
		if(Object.defineProperty) try { Object.defineProperty(row, '__rowNum__', {value:R, enumerable:false}); } catch(e) { row.__rowNum__ = R; }
		else row.__rowNum__ = R;
	}
	if(!dense || sheet["!data"][R]) for (var C = r.s.c; C <= r.e.c; ++C) {
		var val = dense ? (sheet["!data"][R]||[])[C] : sheet[cols[C] + rr];
		if(val == null || val.t === undefined) {
			if(defval === undefined) continue;
			if(hdr[C] != null) { row[hdr[C]] = defval; }
			continue;
		}
		var v = val.v;
		switch(val.t){
			case 'z': if(v == null) break; continue;
			case 'e': v = (v == 0 ? null : void 0); break;
			case 's': case 'b':
			case 'n': if(!val.z || !fmt_is_date(val.z)) break;
			v = numdate(v); // TODO: date1904 setting should also be stored in worksheet object
			if(typeof v == "number") break;
			/* falls through */
			case 'd': if(!(o && (o.UTC||(o.raw === false)))) v = utc_to_local(new Date(v)); break;
			default: throw new Error('unrecognized type ' + val.t);
		}
		if(hdr[C] != null) {
			if(v == null) {
				if(val.t == "e" && v === null) row[hdr[C]] = null;
				else if(defval !== undefined) row[hdr[C]] = defval;
				else if(raw && v === null) row[hdr[C]] = null;
				else continue;
			} else {
				row[hdr[C]] = (val.t === 'n' && typeof o.rawNumbers === 'boolean' ? o.rawNumbers : raw) ? v : format_cell(val, v, o);
			}
			if(v != null) isempty = false;
		}
	}
	return { row: row, isempty: isempty };
}


function sheet_to_json(sheet/*:Worksheet*/, opts/*:?Sheet2JSONOpts*/) {
	if(sheet == null || sheet["!ref"] == null) return [];
	var val = {t:'n',v:0}, header = 0, offset = 1, hdr/*:Array<any>*/ = [], v=0, vv="";
	var r = {s:{r:0,c:0},e:{r:0,c:0}};
	var o = opts || {};
	var range = o.range != null ? o.range : sheet["!ref"];
	if(o.header === 1) header = 1;
	else if(o.header === "A") header = 2;
	else if(Array.isArray(o.header)) header = 3;
	else if(o.header == null) header = 0;
	switch(typeof range) {
		case 'string': r = safe_decode_range(range); break;
		case 'number': r = safe_decode_range(sheet["!ref"]); r.s.r = range; break;
		default: r = range;
	}
	if(header > 0) offset = 0;
	var rr = encode_row(r.s.r);
	var cols/*:Array<string>*/ = [];
	var out/*:Array<any>*/ = [];
	var outi = 0, counter = 0;
	var dense = sheet["!data"] != null;
	var R = r.s.r, C = 0;
	var header_cnt = {};
	if(dense && !sheet["!data"][R]) sheet["!data"][R] = [];
	var colinfo/*:Array<ColInfo>*/ = o.skipHidden && sheet["!cols"] || [];
	var rowinfo/*:Array<ColInfo>*/ = o.skipHidden && sheet["!rows"] || [];
	for(C = r.s.c; C <= r.e.c; ++C) {
		if(((colinfo[C]||{}).hidden)) continue;
		cols[C] = encode_col(C);
		val = dense ? sheet["!data"][R][C] : sheet[cols[C] + rr];
		switch(header) {
			case 1: hdr[C] = C - r.s.c; break;
			case 2: hdr[C] = cols[C]; break;
			case 3: hdr[C] = o.header[C - r.s.c]; break;
			default:
				if(val == null) val = {w: "__EMPTY", t: "s"};
				vv = v = format_cell(val, null, o);
				counter = header_cnt[v] || 0;
				if(!counter) header_cnt[v] = 1;
				else {
					do { vv = v + "_" + (counter++); } while(header_cnt[vv]); header_cnt[v] = counter;
					header_cnt[vv] = 1;
				}
				hdr[C] = vv;
		}
	}
	for (R = r.s.r + offset; R <= r.e.r; ++R) {
		if ((rowinfo[R]||{}).hidden) continue;
		var row = make_json_row(sheet, r, R, cols, header, hdr, o);
		if((row.isempty === false) || (header === 1 ? o.blankrows !== false : !!o.blankrows)) out[outi++] = row.row;
	}
	out.length = outi;
	return out;
}

var qreg = /"/g;
function make_csv_row(sheet/*:Worksheet*/, r/*:Range*/, R/*:number*/, cols/*:Array<string>*/, fs/*:number*/, rs/*:number*/, FS/*:string*/, o/*:Sheet2CSVOpts*/)/*:?string*/ {
	var isempty = true;
	var row/*:Array<string>*/ = [], txt = "", rr = encode_row(R);
	var dense = sheet["!data"] != null;
	var datarow = dense && sheet["!data"][R] || [];
	for(var C = r.s.c; C <= r.e.c; ++C) {
		if (!cols[C]) continue;
		var val = dense ? datarow[C]: sheet[cols[C] + rr];
		if(val == null) txt = "";
		else if(val.v != null) {
			isempty = false;
			txt = ''+(o.rawNumbers && val.t == "n" ? val.v : format_cell(val, null, o));
			for(var i = 0, cc = 0; i !== txt.length; ++i) if((cc = txt.charCodeAt(i)) === fs || cc === rs || cc === 34 || o.forceQuotes) {txt = "\"" + txt.replace(qreg, '""') + "\""; break; }
			if(txt == "ID") txt = '"ID"';
		} else if(val.f != null && !val.F) {
			isempty = false;
			txt = '=' + val.f; if(txt.indexOf(",") >= 0) txt = '"' + txt.replace(qreg, '""') + '"';
		} else txt = "";
		/* NOTE: Excel CSV does not support array formulae */
		row.push(txt);
	}
	if(o.strip) while(row[row.length - 1] === "") --row.length;
	if(o.blankrows === false && isempty) return null;
	return row.join(FS);
}

function sheet_to_csv(sheet/*:Worksheet*/, opts/*:?Sheet2CSVOpts*/)/*:string*/ {
	var out/*:Array<string>*/ = [];
	var o = opts == null ? {} : opts;
	if(sheet == null || sheet["!ref"] == null) return "";
	var r = safe_decode_range(sheet["!ref"]);
	var FS = o.FS !== undefined ? o.FS : ",", fs = FS.charCodeAt(0);
	var RS = o.RS !== undefined ? o.RS : "\n", rs = RS.charCodeAt(0);
	var row = "", cols/*:Array<string>*/ = [];
	var colinfo/*:Array<ColInfo>*/ = o.skipHidden && sheet["!cols"] || [];
	var rowinfo/*:Array<ColInfo>*/ = o.skipHidden && sheet["!rows"] || [];
	for(var C = r.s.c; C <= r.e.c; ++C) if (!((colinfo[C]||{}).hidden)) cols[C] = encode_col(C);
	var w = 0;
	for(var R = r.s.r; R <= r.e.r; ++R) {
		if ((rowinfo[R]||{}).hidden) continue;
		row = make_csv_row(sheet, r, R, cols, fs, rs, FS, o);
		if(row == null) { continue; }
		if(row || (o.blankrows !== false)) out.push((w++ ? RS : "") + row);
	}
	return out.join("");
}

function sheet_to_txt(sheet/*:Worksheet*/, opts/*:?Sheet2CSVOpts*/) {
	if(!opts) opts = {}; opts.FS = "\t"; opts.RS = "\n";
	var s = sheet_to_csv(sheet, opts);
	if(typeof $cptable == 'undefined' || opts.type == 'string') return s;
	var o = $cptable.utils.encode(1200, s, 'str');
	return String.fromCharCode(255) + String.fromCharCode(254) + o;
}

function sheet_to_formulae(sheet/*:Worksheet*/)/*:Array<string>*/ {
	var y = "", x, val="";
	if(sheet == null || sheet["!ref"] == null) return [];
	var r = safe_decode_range(sheet['!ref']), rr = "", cols/*:Array<string>*/ = [], C;
	var cmds/*:Array<string>*/ = [];
	var dense = sheet["!data"] != null;
	for(C = r.s.c; C <= r.e.c; ++C) cols[C] = encode_col(C);
	for(var R = r.s.r; R <= r.e.r; ++R) {
		rr = encode_row(R);
		for(C = r.s.c; C <= r.e.c; ++C) {
			y = cols[C] + rr;
			x = dense ? (sheet["!data"][R]||[])[C] : sheet[y];
			val = "";
			if(x === undefined) continue;
			else if(x.F != null) {
				y = x.F;
				if(!x.f) continue;
				val = x.f;
				if(y.indexOf(":") == -1) y = y + ":" + y;
			}
			if(x.f != null) val = x.f;
			else if(x.t == 'z') continue;
			else if(x.t == 'n' && x.v != null) val = "" + x.v;
			else if(x.t == 'b') val = x.v ? "TRUE" : "FALSE";
			else if(x.w !== undefined) val = "'" + x.w;
			else if(x.v === undefined) continue;
			else if(x.t == 's') val = "'" + x.v;
			else val = ""+x.v;
			cmds[cmds.length] = y + "=" + val;
		}
	}
	return cmds;
}

function sheet_add_json(_ws/*:?Worksheet*/, js/*:Array<any>*/, opts)/*:Worksheet*/ {
	var o = opts || {};
	var dense = _ws ? (_ws["!data"] != null) : o.dense;
	if(DENSE != null && dense == null) dense = DENSE;
	var offset = +!o.skipHeader;
	var ws/*:Worksheet*/ = _ws || ({});
	if(!_ws && dense) ws["!data"] = [];
	var _R = 0, _C = 0;
	if(ws && o.origin != null) {
		if(typeof o.origin == 'number') _R = o.origin;
		else {
			var _origin/*:CellAddress*/ = typeof o.origin == "string" ? decode_cell(o.origin) : o.origin;
			_R = _origin.r; _C = _origin.c;
		}
	}
	var range/*:Range*/ = ({s: {c:0, r:0}, e: {c:_C, r:_R + js.length - 1 + offset}}/*:any*/);
	if(ws['!ref']) {
		var _range = safe_decode_range(ws['!ref']);
		range.e.c = Math.max(range.e.c, _range.e.c);
		range.e.r = Math.max(range.e.r, _range.e.r);
		if(_R == -1) { _R = _range.e.r + 1; range.e.r = _R + js.length - 1 + offset; }
	} else {
		if(_R == -1) { _R = 0; range.e.r = js.length - 1 + offset; }
	}
	var hdr/*:Array<string>*/ = o.header || [], C = 0;
	var ROW = [];
	js.forEach(function (JS, R/*:number*/) {
		if(dense && !ws["!data"][_R + R + offset]) ws["!data"][_R + R + offset] = [];
		if(dense) ROW = ws["!data"][_R + R + offset];
		keys(JS).forEach(function(k) {
			if((C=hdr.indexOf(k)) == -1) hdr[C=hdr.length] = k;
			var v = JS[k];
			var t = 'z';
			var z = "";
			var ref = dense ? "" : (encode_col(_C + C) + encode_row(_R + R + offset));
			var cell/*:Cell*/ = dense ? ROW[_C + C] : ws[ref];
			if(v && typeof v === 'object' && !(v instanceof Date)){
				if(dense) ROW[_C + C] = v;
				else ws[ref] = v;
			} else {
				if(typeof v == 'number') t = 'n';
				else if(typeof v == 'boolean') t = 'b';
				else if(typeof v == 'string') t = 's';
				else if(v instanceof Date) {
					t = 'd';
					if(!o.UTC) v = local_to_utc(v);
					if(!o.cellDates) { t = 'n'; v = datenum(v); }
					z = (cell != null && cell.z && fmt_is_date(cell.z)) ? cell.z : (o.dateNF || table_fmt[14]);
				}
				else if(v === null && o.nullError) { t = 'e'; v = 0; }
				if(!cell) {
					if(!dense) ws[ref] = cell = ({t:t, v:v}/*:any*/);
					else ROW[_C + C] = cell = ({t:t, v:v}/*:any*/);
				} else {
					cell.t = t; cell.v = v;
					delete cell.w; delete cell.R;
					if(z) cell.z = z;
				}
				if(z) cell.z = z;
			}
		});
	});
	range.e.c = Math.max(range.e.c, _C + hdr.length - 1);
	var __R = encode_row(_R);
	if(dense && !ws["!data"][_R]) ws["!data"][_R] = [];
	if(offset) for(C = 0; C < hdr.length; ++C) {
		if(dense) ws["!data"][_R][C + _C] = {t:'s', v:hdr[C]};
		else ws[encode_col(C + _C) + __R] = {t:'s', v:hdr[C]};
	}
	ws['!ref'] = encode_range(range);
	return ws;
}
function json_to_sheet(js/*:Array<any>*/, opts)/*:Worksheet*/ { return sheet_add_json(null, js, opts); }

/* get cell, creating a stub if necessary */
function ws_get_cell_stub(ws/*:Worksheet*/, R, C/*:?number*/)/*:Cell*/ {
	/* A1 cell address */
	if(typeof R == "string") {
		if(ws["!data"] != null) {
			var RC = decode_cell(R);
			if(!ws["!data"][RC.r]) ws["!data"][RC.r] = [];
			return ws["!data"][RC.r][RC.c] || (ws["!data"][RC.r][RC.c] = {t:'z'});
		}
		return ws[R] || (ws[R] = {t:'z'});
	}
	/* cell address object */
	if(typeof R != "number") return ws_get_cell_stub(ws, encode_cell(R));
	/* R and C are 0-based indices */
	return ws_get_cell_stub(ws, encode_col(C||0) + encode_row(R));
}

/* find sheet index for given name / validate index */
function wb_sheet_idx(wb/*:Workbook*/, sh/*:number|string*/) {
	if(typeof sh == "number") {
		if(sh >= 0 && wb.SheetNames.length > sh) return sh;
		throw new Error("Cannot find sheet # " + sh);
	} else if(typeof sh == "string") {
		var idx = wb.SheetNames.indexOf(sh);
		if(idx > -1) return idx;
		throw new Error("Cannot find sheet name |" + sh + "|");
	} else throw new Error("Cannot find sheet |" + sh + "|");
}

/* simple blank or single-sheet workbook object */
function book_new(ws/*:?Worksheet*/, wsname/*:?string*/)/*:Workbook*/ {
	var wb = { SheetNames: [], Sheets: {} };
	if(ws) book_append_sheet(wb, ws, wsname || "Sheet1");
	return wb;
}

/* add a worksheet to the end of a given workbook */
function book_append_sheet(wb/*:Workbook*/, ws/*:Worksheet*/, name/*:?string*/, roll/*:?boolean*/)/*:string*/ {
	var i = 1;
	if(!name) for(; i <= 0xFFFF; ++i, name = undefined) if(wb.SheetNames.indexOf(name = "Sheet" + i) == -1) break;
	if(!name || wb.SheetNames.length >= 0xFFFF) throw new Error("Too many worksheets");
	if(roll && wb.SheetNames.indexOf(name) >= 0 && name.length < 32) {
		var m = name.match(/\d+$/); // at this point, name length is capped at 32
		i = m && +m[0] || 0;
		var root = m && name.slice(0, m.index) || name;
		for(++i; i <= 0xFFFF; ++i) if(wb.SheetNames.indexOf(name = root + i) == -1) break;
	}
	check_ws_name(name);
	if(wb.SheetNames.indexOf(name) >= 0) throw new Error("Worksheet with name |" + name + "| already exists!");

	wb.SheetNames.push(name);
	wb.Sheets[name] = ws;
	return name;
}

/* set sheet visibility (visible/hidden/very hidden) */
function book_set_sheet_visibility(wb/*:Workbook*/, sh/*:number|string*/, vis/*:number*/) {
	if(!wb.Workbook) wb.Workbook = {};
	if(!wb.Workbook.Sheets) wb.Workbook.Sheets = [];

	var idx = wb_sheet_idx(wb, sh);
	// $FlowIgnore
	if(!wb.Workbook.Sheets[idx]) wb.Workbook.Sheets[idx] = {};

	switch(vis) {
		case 0: case 1: case 2: break;
		default: throw new Error("Bad sheet visibility setting " + vis);
	}
	// $FlowIgnore
	wb.Workbook.Sheets[idx].Hidden = vis;
}

/* set number format */
function cell_set_number_format(cell/*:Cell*/, fmt/*:string|number*/) {
	cell.z = fmt;
	return cell;
}

/* set cell hyperlink */
function cell_set_hyperlink(cell/*:Cell*/, target/*:string*/, tooltip/*:?string*/) {
	if(!target) {
		delete cell.l;
	} else {
		cell.l = ({ Target: target }/*:Hyperlink*/);
		if(tooltip) cell.l.Tooltip = tooltip;
	}
	return cell;
}
function cell_set_internal_link(cell/*:Cell*/, range/*:string*/, tooltip/*:?string*/) { return cell_set_hyperlink(cell, "#" + range, tooltip); }

/* add to cell comments */
function cell_add_comment(cell/*:Cell*/, text/*:string*/, author/*:?string*/) {
	if(!cell.c) cell.c = [];
	cell.c.push({t:text, a:author||"SheetJS"});
}

/* set array formula and flush related cells */
function sheet_set_array_formula(ws/*:Worksheet*/, range, formula/*:string*/, dynamic/*:boolean*/) {
	var rng = typeof range != "string" ? range : safe_decode_range(range);
	var rngstr = typeof range == "string" ? range : encode_range(range);
	for(var R = rng.s.r; R <= rng.e.r; ++R) for(var C = rng.s.c; C <= rng.e.c; ++C) {
		var cell = ws_get_cell_stub(ws, R, C);
		cell.t = 'n';
		cell.F = rngstr;
		delete cell.v;
		if(R == rng.s.r && C == rng.s.c) {
			cell.f = formula;
			if(dynamic) cell.D = true;
		}
	}
	var wsr = decode_range(ws["!ref"]);
	if(wsr.s.r > rng.s.r) wsr.s.r = rng.s.r;
	if(wsr.s.c > rng.s.c) wsr.s.c = rng.s.c;
	if(wsr.e.r < rng.e.r) wsr.e.r = rng.e.r;
	if(wsr.e.c < rng.e.c) wsr.e.c = rng.e.c;
	ws["!ref"] = encode_range(wsr);
	return ws;
}

var utils/*:any*/ = {
	encode_col: encode_col,
	encode_row: encode_row,
	encode_cell: encode_cell,
	encode_range: encode_range,
	decode_col: decode_col,
	decode_row: decode_row,
	split_cell: split_cell,
	decode_cell: decode_cell,
	decode_range: decode_range,
	format_cell: format_cell,
	sheet_new: sheet_new,
	sheet_add_aoa: sheet_add_aoa,
	sheet_add_json: sheet_add_json,
	sheet_add_dom: sheet_add_dom,
	aoa_to_sheet: aoa_to_sheet,
	json_to_sheet: json_to_sheet,
	table_to_sheet: parse_dom_table,
	table_to_book: table_to_book,
	sheet_to_csv: sheet_to_csv,
	sheet_to_txt: sheet_to_txt,
	sheet_to_json: sheet_to_json,
	sheet_to_html: sheet_to_html,
	sheet_to_formulae: sheet_to_formulae,
	sheet_to_row_object_array: sheet_to_json,
	sheet_get_cell: ws_get_cell_stub,
	book_new: book_new,
	book_append_sheet: book_append_sheet,
	book_set_sheet_visibility: book_set_sheet_visibility,
	cell_set_number_format: cell_set_number_format,
	cell_set_hyperlink: cell_set_hyperlink,
	cell_set_internal_link: cell_set_internal_link,
	cell_add_comment: cell_add_comment,
	sheet_set_array_formula: sheet_set_array_formula,
	consts: {
		SHEET_VISIBLE: 0,
		SHEET_HIDDEN: 1,
		SHEET_VERY_HIDDEN: 2
	}
};

if(typeof parse_xlscfb !== "undefined") XLSX.parse_xlscfb = parse_xlscfb;
XLSX.parse_zip = parse_zip;
XLSX.read = readSync; //xlsread
XLSX.readFile = readFileSync; //readFile
XLSX.readFileSync = readFileSync;
XLSX.write = writeSync;
XLSX.writeFile = writeFileSync;
XLSX.writeFileSync = writeFileSync;
XLSX.writeFileAsync = writeFileAsync;
XLSX.utils = utils;
XLSX.writeXLSX = writeSyncXLSX;
XLSX.writeFileXLSX = writeFileSyncXLSX;
XLSX.set_fs = set_fs;
XLSX.set_cptable = set_cptable;
XLSX.SSF = SSF;
if(typeof __stream !== "undefined") XLSX.stream = __stream;
if(typeof CFB !== "undefined") XLSX.CFB = CFB;
if(typeof require !== "undefined") {
  var strmod = require('stream');
  if((strmod||{}).Readable) set_readable(strmod.Readable);
	try { _fs = require('fs'); } catch(e) {}
}
}
/*global define */
/*:: declare var define:any; */
if(typeof exports !== 'undefined') make_xlsx_lib(exports);
else if(typeof module !== 'undefined' && module.exports) make_xlsx_lib(module.exports);
else if(typeof define === 'function' && define.amd) define('xlsx', function() { if(!XLSX.version) make_xlsx_lib(XLSX); return XLSX; });
else make_xlsx_lib(XLSX);
/* NOTE: the following extra line is needed for "Lightning Locker Service" */
if(typeof window !== 'undefined' && !window.XLSX) try { window.XLSX = XLSX; } catch(e) {}
