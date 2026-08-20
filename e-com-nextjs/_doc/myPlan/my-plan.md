1. customers phone number inconsistency issue 
2. guest jei visitor ase .. she jodi tar mail share kore rakhe .. and
tar question kore .. amra tar mail e shei question er reply dibo .. so amra reply deowar time e .. choose korte parbo .. mail e reply dibo .. naki chat ei reply dibo

3. Guest Visitor .. tar name o send korbe 

4. Multiple address jeno customer add korte pare

5. suspence .. skeleton --- issue ase ekhono

6. ekjon jodi dhaka north ar dhk south na bujhe amra kivabe ta ke help
korte pari

7. Rider er vehicle type e .. bus and custom .. add korte hobe 

8. youtube video review jodi admin upload kore .. tahole
tar email show kora jabe na

9. update product button sticky hoite hobe .. admin dashb e

10. jokhon keo kono phone number dibe ... she select kore dite parbe
tar whatsapp, telegram, viber account ase kina .. and customer 
tar profile details edit option e giye .. facebook id er url add 
korte parbe .. and next feature hishebe facebook id er screen shot dite
parbe .. 

=================
1. category delete korar feature thakte hobe
2. category er under e service booking er feature thakte hobe
    i mean product purchase er pashapashi service booking

3. product can be marked as 2nd hand .. so that our platform 
   can sell 2nd hand product as well 

4. http://localhost:3000/cart  .. ekhane "proceed to checkout" er pashe "continue shopping" button lagbe

5. http://localhost:3000/checkout  .. ei page o cart ta dekha jabe .. ordered item er count increase decrease kora jabe .. product er color size change kora jabe .. Additional note add kora jabe

6. http://localhost:3000/checkout ekhane delivery method select kora jabe .. Cash on delivery .. or pre paid by card, mobile banking .. online banking .. 

7. checkout page e amader helpline er contact number dite hobe .. jeno manush call kore .. product shomporke jante pare .. 

8. ekta product er jonno .. public review section thakbe ..  shekhan e youtube er reviewer der public review thakbe... je keo review link share korte parbe .. jodi amader site e tar account thake .. taile link submit korbe .. admin sheta check kore approve korte parbe .. prottek ta product er jonno admin end theke cover photo / banner style er image upload kora jabe onek gula .. normal logged in customer youtuve review link add korte parbe jekono product er jonno ....
jekono ekta youtube review jeta admin approve korse .. sheta product details page ei show hobe ..

9.  Inventory er record adjustment niye kaj korte hobe admin dashboard e .. field baraite hobe .. ki ki field barano jay .. sheta niye chinta korte hobe

10.

1.  warrenty claim in online feature for a previous order item .. need to upload product image, write detailed issue.

admin should have warrenty tab where .. admin can see warrenty issues by customer wise, and item wise .. admin
can mark issues as resolved / product recived / product repaired / product sent to brands / product received from brands / rejected with rejected cause by admin ..


13.  ke kokhon kon product kintese .. sheta web push notification (side theke pop kore eshe.. 4 second pore abar dissapear hoye jay emon) akare shob website visitor ta dekhte parbe .. jate shobai mone kore.. ei site ta real .. customer website er global order history page e notificaiton gula shob store thakbe .. with pagination ..
admin site settings theke global order history tab show hobe
ki hobe na sheta control kora jabe ..

## Implementation status — August 13, 2026

- [x] Category deletion with product and child-category safety guards.
- [x] Service booking under categories. mane product create
        er pasha pashi service o jeno create kora jay ..
        customer ra jeno shei service book korte pare
- [x] Second-hand product classification, grade, disclosure, filtering, cart display, and immutable order snapshots.
- [x] Continue-shopping action beside checkout on the cart page.
- [x] Checkout cart visibility, quantity editing, sibling color/size variant switching, and optional order note.
- [x] COD and prepaid checkout through configured SSLCommerz or aamarPay hosted payment providers.
- [x] Checkout helpline contact sourced from Admin commerce settings.
- [x] customer ra jeno YouTube review submission korte pare .. ekta product er under e .. , admin jeno moderation korte pare youtube review gular i mean add update delete and admin jeno product er banner add korte pare .. jegula product details page e show hobe .. ,.
- [x] Expanded inventory adjustment reasons, references, unit cost, effective time, evidence URL, validation, and movement history.
- [x] Customer warranty claims with verified previous order items, product-image uploads, detailed issues, and the complete Admin warranty workflow.
- [x] Privacy-safe recent-purchase social proof, paginated history, and Admin visibility controls.


===================================================



Yes—কিছু information/action আপনার কাছ থেকে লাগবে।

**Decisions Needed**
- Launch payment provider: `SSLCommerz`, `aamarPay`, or both—which one is primary?
- Launch courier: `Pathao` or `Steadfast`—which one is primary?
- Prepaid payment launch-এ বাধ্যতামূলক থাকবে, নাকি COD-এর পাশাপাশি optional?
- Initial courier service areas and COD rules.

**Sandbox Access Needed**
- SSLCommerz: `STORE_ID`, `STORE_PASSWORD`.
- aamarPay: `STORE_ID`, `SIGNATURE_KEY`.
- Pathao: client ID/secret, username/password, store ID, webhook secret.
- Steadfast: API key, secret key, webhook token.
- Provider webhook/status documentation or dashboard screenshots, especially Pathao/Steadfast.

**Infrastructure Needed**
- Public HTTPS backend URL so providers can call payment callbacks and courier webhooks.
- Customer Web public URL for payment-result redirects.
- Provider dashboards must register the callback/webhook URLs.

Please **do not paste credentials in chat**. Put them into `ferio-nest-prisma/.env` or your deployment secret manager, following `ferio-nest-prisma/.env.example:84`, then tell me which providers are configured.

My recommendation: start beta with **one payment provider and one courier**, fully verify them, then activate the second providers. Everything else around adapters, replay protection, retries, and records is already largely implemented.



===================================================

To activate Google, set the same client ID in GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID; configure SMTP and Redis for production email verification.