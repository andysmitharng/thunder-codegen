import { RequestCodeModel } from "../models/requestModel";
import CodeGenerator from "./codeGenerator";
import { CodeResultModel } from "../models/codeModels";

export default class JavaOkHttp implements CodeGenerator {
    id: string = "java-okhttp";
    displayName: string = "Java OkHttp";
    lang: string = "java";

    getCode(request: RequestCodeModel): CodeResultModel {
        let codeBuilder = [];

        codeBuilder.push(`OkHttpClient client = new OkHttpClient().newBuilder().build();`);

        let body = request.body;
        if (body) {
            if (body.type == "formdata" && (body.form || body.files)) {
                codeBuilder.push(`RequestBody body = new MultipartBody.Builder().setType(MultipartBody.FORM)`);

                body.form?.forEach(element => {
                    codeBuilder.push(`.addFormDataPart("${element.name}", "${element.value}")`);
                });

                body.files?.forEach(element => {
                    codeBuilder.push(`.addFormDataPart("${element.name}", "${element.value}",RequestBody.create(MediaType.parse("application/octet-stream"),
                    new File("${element.value}")))`);
                });

                codeBuilder.push(`.build();`);
            } else if (body.type == "formencoded" && body.form) {
                codeBuilder.push(`RequestBody body = new FormBody.Builder()`);
                body.form?.forEach(element => {
                    codeBuilder.push(`.add("${element.name}", "${element.value}")`);
                });
                codeBuilder.push(`.build();`);
            } else if (body.raw) {
                let contentType = "application/json";
                if (body.type == "xml") {
                    contentType = "application/xml"
                }
                if (body.type === "text") {
                    contentType = "text/plain";
                }
                let bodyString = JSON.stringify(body.raw);

                codeBuilder.push(`RequestBody body = RequestBody.create(${bodyString.replace(/\\n/g, "")}, MediaType.parse("${contentType}"));`);
            } else if (body.graphql) {
                let varData = body.graphql.variables;
                let variablesData = varData ? JSON.parse(varData.replace(/\n/g, " ")) : "{}"

                let gqlBody = {
                    query: body.graphql.query,
                    variables: variablesData
                }

                let bodyString = JSON.stringify(gqlBody);
                codeBuilder.push(`RequestBody body = RequestBody.create(${bodyString.replace(/\\n/g, "")}, MediaType.parse("application/json"));`);

            } else if (body.binary) {
                let contentType = request.headers.find(s => s.name == "Content-Type")?.value;
                codeBuilder.push(`RequestBody body = RequestBody.create(Files.readAllBytes(new File("${body.binary}").toPath()), MediaType.parse("${contentType}"));`);
            } else {
                codeBuilder.push(`RequestBody body = RequestBody.create("", MediaType.parse("text/plain"));`);
            }
        } else {
            codeBuilder.push(`RequestBody body = RequestBody.create("", MediaType.parse("text/plain"));`);
        }
        codeBuilder.push(``);

        codeBuilder.push(`Request request = new Request.Builder()
        .url("${request.url}")
        .method("${request.method.toUpperCase()}", body)`);

        request.headers.forEach(element => {
            if (!element.name.includes("Content-Type")) {
                codeBuilder.push(`.addHeader("${element.name}", "${element.value}")`);
            }
        });

        codeBuilder.push(`.build();`);

        codeBuilder.push(`Response response = client.newCall(request).execute();`);

        codeBuilder.push(`String responseString = response.body().string();`);

        codeBuilder.push(`System.out.println(responseString);`);

        let codeResult = new CodeResultModel(this.lang);
        codeResult.code = codeBuilder.join("\n");
        return codeResult;
    }

}