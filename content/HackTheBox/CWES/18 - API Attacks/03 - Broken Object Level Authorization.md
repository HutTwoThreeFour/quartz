# Broken Object Level Authorization

---

Web APIs allow users to request data or records by sending various parameters, including unique identifiers such as `Universally Unique Identifiers` (`UUIDs`), also known as `Globally Unique Identifiers` (`GUIDs`), and integer IDs. However, failing to properly and securely verify that a user has ownership and permission to view a specific resource through `object-level authorization mechanisms` can lead to data exposure and security vulnerabilities.

A web API endpoint is vulnerable to `Broken Object Level Authorization` (`BOLA`), also known as `Insecure Direct Object Reference` (`IDOR`), if its authorization checks (implemented at the source-code level) fail to correctly ensure that an authenticated user has sufficient permissions or privileges to request and view specific data or perform certain operations.

## Authorization Bypass Through User-Controlled Key

The endpoint we will be practicing against is vulnerable to [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html).

### Scenario

The admin of `Inlanefreight E-Commerce Marketplace` has provided us with the credentials `htbpentester1@pentestercompany.com:HTBPentester1`, wanting us to assess what API vulnerabilities the user can exploit with their assigned roles.

Because the account belongs to a Supplier, we will utilize the `/api/v1/authentication/suppliers/sign-in` endpoint to sign in and obtain a JWT:

![GIF showcasing the usage of Swagger UI to send a request to an API call.](resources/Authenitcation_Suppliers.gif)

To authenticate using the JWT, we will copy it from the response and click the `Authorize` button. Note the lock icon, currently unlocked, indicating our non-authenticated status. Next, we will paste the JWT into the `Value` text field within the `Available authorizations` popup and click `Authorize`. Upon completion, the lock icon will be fully locked, confirming our authentication:

![GIF showcasing the authorization using a JWT token.](resources/Authentication_Suppliers_2.gif)

When examining the endpoints within the Suppliers group (notice how they have a lock at their right-most side, indicating that authentication is required), we will notice one named `/api/v1/suppliers/current-user`:

![Swagger UI for Suppliers API. Endpoints: Get all suppliers, get supplier by ID, count suppliers by name, get current user supplier, get all quarterly reports, get report by ID.](resources/API1_2023_Broken_Object_Level_Authorization_Image_5.png)

Endpoints containing `current-user` in their path indicate that they utilize the JWT of the currently authenticated user to perform the specified operation, which in this case is retrieving the current user's data. Upon invoking the endpoint, we will retrieve our current user's company `ID`, `b75a7c76-e149-4ca7-9c55-d9fc4ffa87be`, a `Guid` value:

![GET request for /api/v1/supplier-companies/current-user. No parameters. Response: Supplier company details with ID, name "PentesterCompany", email, and other attributes.](resources/API1_2023_Broken_Object_Level_Authorization_Image_6.png)

Let us then retrieve our current user's roles. After invoking the `/api/v1/roles/current-user` endpoint, it responds with the role `SupplierCompanies_GetYearlyReportByID`:

![GET request for /api/v1/roles/current-user. No parameters. Response: Roles of the user, including "SupplierCompanies_GetYearlyReportByID".](resources/API1_2023_Broken_Object_Level_Authorization_Image_7.png)

In the `Supplier-Companies` group, we find an endpoint related to the role `SupplierCompanies_GetYearlyReportByID` that accepts a GET parameter: `/api/v1/supplier-companies/yearly-reports/{ID}`:

![Supplier-Companies API endpoints: Update, get, and create supplier companies; manage certificates of incorporation; get current user company; get all or specific yearly reports.](resources/API1_2023_Broken_Object_Level_Authorization_Image_8.png)

When expanding it, we will notice that it requires the `SupplierCompanies_GetYearlyReportByID` role and accepts the `ID` parameter as an integer and not a `Guid`:

![GET request for /api/v1/supplier-companies/yearly-reports/{ID}. Requires role: SupplierCompanies_GetYearlyReportByID. Parameter: ID (integer). Response: JSON with error message.](resources/API1_2023_Broken_Object_Level_Authorization_Image_9.png)

If we use `1` as the `ID`, we will receive a yearly-report belonging to a company with the ID `f9e58492-b594-4d82-a4de-16e4f230fce1`, which is not the one we belong to, `b75a7c76-e149-4ca7-9c55-d9fc4ffa87be`:

![GET request for /api/v1/supplier-companies/yearly-reports/1. Response: Yearly report with ID 1, company ID, year 2020, revenue 794425112, and comments from C-Level praising performance.](resources/API1_2023_Broken_Object_Level_Authorization_Image_10.png)

When trying other IDs, we still can access yearly reports of other supplier-companies, allowing us to access potentially sensitive business data:

![GET request for /api/v1/supplier-companies/yearly-reports/13. Response: Yearly report with ID 13, company ID, year 2020, revenue 588820631, and comments from C-Level praising dedication.](resources/API1_2023_Broken_Object_Level_Authorization_Image_11.png)

Additionally, we can mass abuse the `BOLA` vulnerability and fetch the first 20 yearly reports of supplier-companies:

![GIF showcasing the BOLA mass abuse to fetch the first 20 yearly reports.](resources/BOLA_Mass_Abuse.gif)

The only changes we need to make to the copied cURL command from the `Swagger` interface are using a Bash `for-loop` with `variable interpolation`, adding a new line after each response using the flag `-w "\n"`, silencing progress using the flag `-s`, and piping the output to [jq](https://jqlang.github.io/jq/):

```
        shellsession
hiimeins@htb[/htb]$ for ((i=1; i<= 20; i++)); do
curl -s -w "\n" -X 'GET' \
  'http://94.237.49.212:43104/api/v1/supplier-companies/yearly-reports/'$i'' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6Imh0YnBlbnRlc3RlcjFAcGVudGVzdGVyY29tcGFueS5jb20iLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJTdXBwbGllckNvbXBhbmllc19HZXRZZWFybHlSZXBvcnRCeUlEIiwiZXhwIjoxNzIwMTg1NzAwLCJpc3MiOiJodHRwOi8vYXBpLmlubGFuZWZyZWlnaHQuaHRiIiwiYXVkIjoiaHR0cDovL2FwaS5pbmxhbmVmcmVpZ2h0Lmh0YiJ9.D6E5gJ-HzeLZLSXeIC4v5iynZetx7f-bpWu8iE_pUODlpoWdYKniY9agU2qRYyf6tAGdTcyqLFKt1tOhpOsWlw' | jq
done

{
  "supplierCompanyYearlyReport": {
    "id": 1,
    "companyID": "f9e58492-b594-4d82-a4de-16e4f230fce1",
    "year": 2020,
    "revenue": 794425112,
    "commentsFromCLevel": "Superb work! The Board is over the moon! All employees will enjoy a dream vacation!"
  }
}
{
  "supplierCompanyYearlyReport": {
    "id": 2,
    "companyID": "f9e58492-b594-4d82-a4de-16e4f230fce1",
    "year": 2022,
    "revenue": 339322952,
    "commentsFromCLevel": "Excellent performance! The Board is exhilarated! Prepare for a special vacation adventure!"
  }
}
{
  "supplierCompanyYearlyReport": {
    "id": 3,
    "companyID": "058ac1e5-3807-47f3-b546-cc069366f8f9",
    "year": 2020,
    "revenue": 186208503,
    "commentsFromCLevel": "Phenomenal performance! The Board is deeply impressed! Everyone will be treated to a deluxe vacation!"
  }
}

<SNIP>
```

### Prevention

To mitigate the `BOLA` vulnerability, the endpoint `/api/v1/supplier-companies/yearly-reports` should implement a verification step (at the source code level) to ensure that authorized users can only access yearly reports associated with their affiliated company. This verification involves comparing the `companyID` field of the report with the authenticated supplier's `companyID`. Access should be granted only if these values match; otherwise, the request should be denied. This approach effectively maintains data segregation between supplier-companies' yearly reports.
