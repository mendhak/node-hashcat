/**
 * Created with JetBrains WebStorm.
 * User: mendhak
 * Date: 03/08/13
 * Time: 19:38
 * To change this template use File | Settings | File Templates.
 */


function myFunction()
{
    var x="",i;
    for (i=1; i<=6; i++)
    {
        x=x + "<h" + i + ">Heading " + i + "</h" + i + ">";
    }
    document.getElementById("demo").innerHTML=x;
}