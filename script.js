let immobili=[]

fetch("immobili.json")
.then(res=>res.json())
.then(data=>{
immobili=data
mostraImmobili(data)
})

function mostraImmobili(lista){

let container=document.getElementById("lista-immobili")

container.innerHTML=""

lista.forEach(i=>{

container.innerHTML+=`

<div class="card">

<img src="${i.immagine}">

<h3>${i.titolo}</h3>

<p>${i.citta}</p>

<p>${i.mq} mq</p>

<p>€ ${i.prezzo}</p>

</div>

`

})

}

function cerca(){

let citta=document.getElementById("citta").value.toLowerCase()

let prezzo=document.getElementById("prezzo").value

let risultati=immobili.filter(i=>{

let okCitta=i.citta.toLowerCase().includes(citta)

let okPrezzo=!prezzo || i.prezzo<=prezzo

return okCitta && okPrezzo

})

mostraImmobili(risultati)

}
