# Vulnerable Password Reset

---

We have already discussed how to brute-force password reset tokens to gain access to a victim's account. However, even if a web application utilizes rate limiting and CAPTCHAs, business logic bugs within the password reset functionality can still allow for the takeover of other users' accounts.

---

## Guessable Password Reset Questions

Often, web applications authenticate users who have lost their passwords by requiring them to answer one or more security questions. During registration, users provide answers to predefined and generic security questions, disallowing users from entering custom ones. Therefore, within the same web application, the security questions of all users will be the same, allowing attackers to abuse them.

Assuming we had found such functionality on a target website, we should attempt to exploit it to bypass authentication. Often, the weak link in a question-based password reset functionality is the predictability of the answers. It is common to find questions like the following:

- "`What is your mother's maiden name?`"
- "`What city were you born in?`"

While these questions seem tied to the individual user, they can often be obtained through `OSINT` or guessed, given a sufficient number of attempts, i.e., a lack of brute-force protection.

For instance, assuming a web application uses a security question like `What city were you born in?`:

http://<SERVER\_IP>:<PORT>/security\_question.php

![Security question page asking, "What city were you born in?" Field for response and submit button. Link to return to login.](resources/pwreset_1.png)

We can attempt to brute-force the answer to this question by using a proper wordlist. There are multiple lists containing large cities worldwide. For instance, [this](https://github.com/datasets/world-cities/blob/master/data/world-cities.csv) CSV file contains a list of more than 25,000 cities with more than 15,000 inhabitants from all over the world. This is a great starting point for brute-forcing the city in which a user was born.

Since the CSV file contains the city name in the first field, we can create our wordlist containing only the city name on each line using the following command:

```
        shellsession
hiimeins@htb[/htb]$ cat world-cities.csv | cut -d ',' -f1 > city_wordlist.txt

hiimeins@htb[/htb]$ wc -l city_wordlist.txt 

26468 city_wordlist.txt
```

As we can see, this results in a total of 26,468 cities.

To set up our brute-force attack, we first need to specify the user we want to target:

http://<SERVER\_IP>:<PORT>/reset.php

![Page prompting to "Enter your username." Field for username and submit button. Link to return to login.](resources/pwreset_2.png)

As an example, we will target the user `admin`. After specifying the username, we must answer the user's security question. The corresponding request looks like this:

![HTTP request and response. Request: POST to /security_question.php with response "test". Response: "Incorrect response."](resources/pwreset_3.png)

We can set up the corresponding `ffuf` command from this request to brute-force the answer. Keep in mind that we need to specify our session cookie to associate our request with the username `admin` we specified in the previous step:

```
        shellsession
hiimeins@htb[/htb]$ ffuf -w ./city_wordlist.txt -u http://pwreset.htb/security_question.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -b "PHPSESSID=39b54j201u3rhu4tab1pvdb4pv" -d "security_response=FUZZ" -fr "Incorrect response."

<SNIP>

[Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 0ms]
    * FUZZ: Houston
```

After obtaining the security response, we can reset the admin user's password and entirely take over the account:

http://<SERVER\_IP>:<PORT>/reset\_password.php

![Password reset page with a field for new password and submit button. Link to return to login.](resources/pwreset_4.png)

We could narrow down the cities if we had additional information on our target to reduce the time required for our brute-force attack on the security question. For instance, if we knew that our target user was from Germany, we could create a wordlist containing only German cities, reducing the number to about a thousand cities:

```
        shellsession
hiimeins@htb[/htb]$ cat world-cities.csv | grep Germany | cut -d ',' -f1 > german_cities.txt

hiimeins@htb[/htb]$ wc -l german_cities.txt 

1117 german_cities.txt
```

---

## Manipulating the Reset Request

Another instance of a flawed password reset logic occurs when a user can manipulate a potentially hidden parameter to reset the password of a different account.

For instance, consider the following password reset flow, which is similar to the one discussed above. First, we specify the username:

http://<SERVER\_IP>:<PORT>/reset.php

![Page prompting to "Enter your username." Field for username and submit button. Link to return to login.](resources/pwreset_5.png)

We will use our demo account `htb-stdnt`, which results in the following request:

```
        http
POST /reset.php HTTP/1.1
Host: pwreset.htb
Content-Length: 18
Content-Type: application/x-www-form-urlencoded
Cookie: PHPSESSID=39b54j201u3rhu4tab1pvdb4pv

username=htb-stdnt
```

Afterward, we need to supply the response to the security question:

http://<SERVER\_IP>:<PORT>/security\_question.php

![Security question page asking, "What city were you born in?" Field for response and submit button. Link to return to login.](resources/pwreset_6.png)

Supplying the security response `London` results in the following request:

```
        http
POST /security_question.php HTTP/1.1
Host: pwreset.htb
Content-Length: 43
Content-Type: application/x-www-form-urlencoded
Cookie: PHPSESSID=39b54j201u3rhu4tab1pvdb4pv

security_response=London&username=htb-stdnt
```

As we can see, the username is contained in the form as a hidden parameter and sent along with the security response. Finally, we can reset the user's password:

http://<SERVER\_IP>:<PORT>/reset\_password.php

![Password reset confirmation for user htb-stdnt. Field for new password and submit button. Link to return to login.](resources/pwreset_7.png)

The final request looks like this:

```
        http
POST /reset_password.php HTTP/1.1
Host: pwreset.htb
Content-Length: 36
Content-Type: application/x-www-form-urlencoded
Cookie: PHPSESSID=39b54j201u3rhu4tab1pvdb4pv

password=P@$$w0rd&username=htb-stdnt
```

Like the previous request, the request contains the username in a separate POST parameter. Suppose the web application does not properly verify that the usernames in both requests match. In that case, we can skip the security question or supply the answer to our security question and then set the password of an entirely different account. For instance, we can change the admin user's password by manipulating the `username` parameter of the password reset request:

```
        http
POST /reset_password.php HTTP/1.1
Host: pwreset.htb
Content-Length: 32
Content-Type: application/x-www-form-urlencoded
Cookie: PHPSESSID=39b54j201u3rhu4tab1pvdb4pv

password=P@$$w0rd&username=admin
```

To prevent this vulnerability, keeping a consistent state during the entire password reset process is essential. Resetting an account's password is a sensitive process where minor implementation flaws or logic bugs can enable an attacker to take over other users' accounts. As such, we should investigate the password reset functionality of any web application closely and keep an eye out for potential security issues.
