"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordPhoneDto = exports.AuthResponseDto = exports.LoginDto = exports.RegisterDto = void 0;
var register_dto_1 = require("./register.dto");
Object.defineProperty(exports, "RegisterDto", { enumerable: true, get: function () { return register_dto_1.RegisterDto; } });
var login_dto_1 = require("./login.dto");
Object.defineProperty(exports, "LoginDto", { enumerable: true, get: function () { return login_dto_1.LoginDto; } });
var auth_response_dto_1 = require("./auth-response.dto");
Object.defineProperty(exports, "AuthResponseDto", { enumerable: true, get: function () { return auth_response_dto_1.AuthResponseDto; } });
__exportStar(require("./otp.dto"), exports);
var otp_dto_1 = require("./otp.dto");
Object.defineProperty(exports, "ResetPasswordPhoneDto", { enumerable: true, get: function () { return otp_dto_1.ResetPasswordPhoneDto; } });
//# sourceMappingURL=index.js.map