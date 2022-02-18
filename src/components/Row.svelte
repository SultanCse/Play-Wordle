<script>
    export let background = "";
    export let letters;
    export let id;
</script>

{#if letters}
  <div class="row w-50 mb-1 row-cols-5 gx-2">
    {#each letters as letter, index}
      <div class="col my-1">
        <div
          class="border {id == index
            ? background
            : ''} rounded w-100 d-flex justify-content-center"
        >
          {letter}
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- <div class="row w-50 mb-1 row-cols-5 gx-2">
  <div class="col my-1">
    <div
      class="border bg-primary rounded h-2 w-100 d-flex justify-content-center"
    >
      A
    </div>
  </div>
  <div class="col my-1">
    <div class="border rounded h-2 w-100 d-flex justify-content-center">P</div>
  </div>
  <div class="col my-1">
    <div class="  border rounded h-2 w-100 d-flex justify-content-center">
      E
    </div>
  </div>
  <div class="col my-1">
    <div class="  border rounded h-2 w-100 d-flex justify-content-center">
      R
    </div>
  </div>
  <div class="col my-1">
    <div class="  border rounded h-2 w-100 d-flex justify-content-center">
      T
    </div>
  </div>
</div> -->
