import { RequestCodeModel } from "../models/requestModel";
import CodeGenerator from "./codeGenerator";
import { CodeResultModel } from "../models/codeModels";
import { firstLetterUpper } from "../helpers/helper";

export default class JavaHttpClient implements CodeGenerator {
    // depend on JDK8+ ,org.apache.httpcomponents httpmime 4.4+
    id: string = "java-httpclient";
    displayName: string = "Java HttpClient";
    lang: string = "java";
    getCode(request: RequestCodeModel): CodeResultModel {
        let codeResult = new CodeResultModel(this.lang);
        let codeBuilder = [];

        codeBuilder.push(`CloseableHttpClient httpClient = HttpClients.createDefault();`);
        codeBuilder.push(`RequestBuilder requestBuilder = RequestBuilder.create("${request.method.toUpperCase()}");`);
        codeBuilder.push(`requestBuilder.setUri("${request.url}");`);
        codeBuilder.push(``);

        request.headers.forEach(element => {
            if (!element.name.includes("Content-Type")) {
                codeBuilder.push(`requestBuilder.addHeader("${element.name}", "${element.value}");`);
            }
        });
        codeBuilder.push(``);

        let body = request.body;
        if (body) {
            if (body.type == "formdata" && (body.form || body.files)) {
                codeBuilder.push(`MultipartEntityBuilder entityBuilder = MultipartEntityBuilder.create();`);

                body.form?.forEach(element => {
                    codeBuilder.push(`entityBuilder.addTextBody("${element.name}", "${element.value}");`);
                });
                body.files?.forEach(element => {
                    codeBuilder.push(`entityBuilder.addBinaryBody("${element.name}",new File("${element.value}"));`);
                });

                codeBuilder.push(`requestBuilder.setEntity(entityBuilder.build());`);

            } else if (body.type == "formencoded" && body.form) {
                codeBuilder.push(`EntityBuilder entityBuilder = EntityBuilder.create();`);
                codeBuilder.push(`List<NameValuePair> parameters = new ArrayList<>();`);
                body.form.forEach(element => {
                    codeBuilder.push(`parameters.add(new BasicNameValuePair("${element.name}", "${element.value}"));`);
                });
                codeBuilder.push(`entityBuilder.setParameters(parameters);`);
                codeBuilder.push(`requestBuilder.setEntity(entityBuilder.build());`);
            } else if (body.raw) {
                let contentType = "application/json";
                if (body.type == "xml") {
                    contentType = "application/xml"
                }
                if (body.type === "text") {
                    contentType = "text/plain";
                }
                let bodyString = JSON.stringify(body.raw);

                codeBuilder.push(`StringEntity entity = new StringEntity(${bodyString.replace(/\\n/g, "")}, ContentType.create("${contentType}"));`);
                codeBuilder.push(`requestBuilder.setEntity(entity);`);

            } else if (body.graphql) {
                let varData = body.graphql.variables;
                let variablesData = varData ? JSON.parse(varData.replace(/\n/g, " ")) : "{}"

                let gqlBody = {
                    query: body.graphql.query,
                    variables: variablesData
                }

                let bodyString = JSON.stringify(gqlBody);
                codeBuilder.push(`StringEntity entity = new StringEntity("${bodyString.replace(/\\n/g, "")}", ContentType.create("application/json"));`);
                codeBuilder.push(`requestBuilder.setEntity(entity);`);
            } else if (body.binary) {
                let contentType = request.headers.find(s => s.name == "Content-Type")?.value;

                codeBuilder.push(`ByteArrayEntity byteArrayEntity = new ByteArrayEntity(Files.readAllBytes(new File("${body.binary}").toPath()), ContentType.create("${contentType}", "UTF-8"));`)
            }
        }
        codeBuilder.push(``);

        codeBuilder.push(`HttpUriRequest request = requestBuilder.build();`);
        codeBuilder.push(`CloseableHttpResponse response = httpClient.execute(request);`);
        codeBuilder.push(`String responseBody = EntityUtils.toString(response.getEntity());`);
        codeBuilder.push(`System.out.println(responseBody);`);

        codeResult.code = codeBuilder.join("\n");
        return codeResult;
    }
}