CID=$(docker ps -q -f name=i158oirldzf2kl9yx12aiswd | head -n1)
docker logs --tail 30 $CID
