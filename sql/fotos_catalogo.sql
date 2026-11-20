update public.produto p
set imagem_url = foto.imagem_url
from (values
    (1, 'T-Shirt Logo', '/imagens/produtos/tshirt-logo.png'),
    (2, 'Moletom Essential', '/imagens/produtos/moletom-essential.png'),
    (3, 'Cargo Pants', '/imagens/produtos/cargo-pants.png'),
    (4, 'Boné DripLab', '/imagens/produtos/bone-driplab.png'),
    (5, 'Jaqueta Tech', '/imagens/produtos/jaqueta-tech.png')
) as foto (id_produto, nome_produto, imagem_url)
where p.id_produto = foto.id_produto
    and p.nome_produto = foto.nome_produto
    and p.imagem_url is null;
