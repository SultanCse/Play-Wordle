<script>
    export let onText = '';
    export let offText = '';
    export let width = '80px';
    export let checkedValue = false;
    
</script>
<label class='toggle' for='mytoggle' style="--width: {width}">
    <input class='toggle__input' type='checkbox' id='mytoggle' bind:checked={checkedValue}>
    <div class="toggle__fill ">
        <div class="row g-0 h-100 mw-50 text-center">
            <div class="on col"><p >{onText}</p></div>
            <div class="off col"><p>{offText}</p></div>
        </div>
    </div>
</label>
<style>
    .toggle{
        /* --width: 400px; */
        --height: calc(var(--width) / 2);
        --border-radius: calc(var(--height) / 2);
        display: inline-block;
        cursor: pointer;
    }
    .toggle__input{
        display: none;
    }
    .toggle__fill{
        position: relative;
        width: var(--width);
        height: var(--height);
        border-radius: var(--border-radius);
        background: #dddddd;
        transition: .2s;
    }
    .toggle__input:checked ~ .toggle__fill{
        background: #4bca4b;
    }

    .toggle__fill::after{
        content: '';
        text-align: center;
        font-size: calc(var(--height) / 2);
        position: absolute;
        left: 0;
        top: 0;
        background: #ffffff;
        border-radius: var(--border-radius);
        height: var(--height);
        width: var(--height);
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
        transition: .2s; 
    }
    .toggle__input:checked ~ .toggle__fill::after{
        content: '';
        transform: translateX(var(--height));
    }
    p{
        font-size: calc(var(--height) / 2);        
        margin-top: 6%;
        /* color: red; */
    }
    
</style>