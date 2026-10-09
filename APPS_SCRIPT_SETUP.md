# Connect Chanukah confirmation emails through Gmail

The private `.local-chanukah/Chanukah-Code.txt` file is ready to copy. It contains a connection token already stored server-side. Do not commit or share its contents.

1. Open https://script.google.com/home/start as **esemmoc@gmail.com** and create a project named **Chanukah Carnival Email**.
2. Copy all of `.local-chanukah/Chanukah-Code.txt` into **Code.gs** and save.
3. Choose **Deploy → New deployment → Web app**.
4. Set **Execute as: Me (esemmoc@gmail.com)** and **Who has access: Anyone**. The script requires the private token to send.
5. Deploy and authorize sending mail in your Google account.
6. Send Codex the **Web app URL ending in /exec**. Codex will check the authenticated connection and quota, then configure the server to use it.

Both the organizer and the form's saved email address receive separate messages. Successful sends are recorded privately in the script so retries skip those recipients. Acceptance does not prove inbox delivery. If sending succeeds but recording the receipt fails, a retry can duplicate the email.

For later script updates, choose **Deploy → Manage deployments → Edit → New version → Deploy**; saving alone does not update the live deployment.

References: [Web apps](https://developers.google.com/apps-script/guides/web), [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app).
